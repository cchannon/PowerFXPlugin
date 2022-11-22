using Microsoft.Xrm.Sdk;
using System;
using Microsoft.PowerFx;
using Microsoft.PowerFx.Types;
using Microsoft.PowerFx.Core;
using System.Linq;
using Microsoft.Xrm.Sdk.Query;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.Runtime.Serialization.Json;
using System.IO;
using Newtonsoft.Json;

namespace pfxPlugin
{
    public class Plugin1 : PluginBase
    {
        private string pfxRecordId = null;
        private ILocalPluginContext _pluginContext;
        private string entityName;
        private ParserOptions opts;
        private RecordValue parameters;
        private List<string> reservedColumns = new List<string>(){
            "createdon","createdby","modifiedon","modifiedby","timezoneruleversionnumber","versionnumber","importsequencenumber","utcconversiontimezonecode"
        };

        public Plugin1(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(Plugin1))
        {
            if(unsecureConfiguration != null){
                pfxRecordId = unsecureConfiguration;
            }
        }

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            try {
                if (localPluginContext == null)
                {
                    throw new ArgumentNullException(nameof(localPluginContext));
                }
                _pluginContext = localPluginContext;

                IOrganizationService orgService = _pluginContext.InitiatingUserService;
                var query = new QueryExpression("ktcs_plugincommand");
                query.ColumnSet.AddColumns(new string[]{ "ktcs_command", "ktcs_context", "ktcs_formulas", "ktcs_functions" });
                query.Criteria.AddCondition(new ConditionExpression("ktcs_plugincommandid", ConditionOperator.Equal, pfxRecordId));
                var results = orgService.RetrieveMultiple(query).Entities;
                if(results != null && results.Count>0){
                    if(localPluginContext.PluginExecutionContext.InputParameters["Target"] is Entity entity){
                        entityName = entity.LogicalName;
                        var pfxstring = results[0].GetAttributeValue<string>("ktcs_command");
                        _pluginContext.Trace($"PFX: {pfxstring}");
                        string global = results[0].GetAttributeValue<string>("ktcs_context");

                        var dynamicObject = JsonConvert.DeserializeObject<Dictionary<string, object>>(global);
                        _pluginContext.Trace($"{dynamicObject.Count.ToString()} objects found in context");

                        foreach (var pair in dynamicObject)
                        {
                            _pluginContext.Trace($"Pair: {pair.Key} ---- {pair.Value}");
                        }

                        parameters = (RecordValue)FormulaValue.FromJson(global);
                        var config = new PowerFxConfig();
                        config.EnableSetFunction();
                        opts = new ParserOptions { AllowsSideEffects = true };

                        var engine = new RecalcEngine(config);
                        var symbol = new SymbolTable();
                        symbol.EnableMutationFunctions();
                        engine.Config.SymbolTable = symbol;

                        string[] lines = pfxstring.Split(';');
                        _pluginContext.Trace($"{lines.Count()} commands found.");
                        foreach (var line in lines){
                            var result = engine.Eval(line, parameters, opts);

                            if (result is ErrorValue errorValue)
                                throw new InvalidPluginExecutionException("Error: " + errorValue.Errors[0].Message);
                            else
                            {
                                localPluginContext.Trace($"Non-Behavior Eval Output: {PrintResult(result)}");
                            }
                        }

                        Entity update = contextComparison(parameters, engine, entity.Id);
                        if(update.Attributes.Count>0){
                            orgService.Update(update);
                        }
                        else{
                            _pluginContext.Trace("No attributes in the context object were modified. Bypassing record update");
                        }
                    }
                }
            }
            catch(Exception ex){
                _pluginContext.Trace($"Exception in ExecuteDataversePlugin: {ex.Message}");
                throw;
            }
        }

        Entity contextComparison(RecordValue Pre, RecalcEngine engine, Guid id) {
            Entity entity = new Entity(entityName, id);
            foreach (var column in Pre.Fields.ToList())
            {
                try
                {
                    _pluginContext.Trace($"Column: {column.Name}");
                    var evaluated = engine.Eval(column.Name, parameters, opts).ToObject();
                    if (reservedColumns.Contains(column.Name))
                    {
                        _pluginContext.Trace("column for comparison found in list of reserved columns. Skipping eval.");
                        continue;
                    }
                    else if (evaluated.GetType().Name == "ExpandoObject") //non-primitive
                    {
                        var label = (column.Value.ToObject() as IDictionary<string, object>)["label"];
                        var value = (column.Value.ToObject() as IDictionary<string, object>).ContainsKey("value") ?
                                    (column.Value.ToObject() as IDictionary<string, object>)["value"] :
                                    null;
                        object postLabel;
                        if (value != null) //optionset
                        {
                            //_pluginContext.Trace($"PreValue -- label: {label.ToString()}, value: {value.ToString()}");
                            postLabel = engine.Eval($"{column.Name}.label", parameters, opts).ToObject();
                            object postValue = engine.Eval($"{column.Name}.value", parameters, opts).ToObject();
                            //_pluginContext.Trace($"PostValue -- label: {postLabel}, value: {postValue}");

                            if (value.ToString() != postValue.ToString())
                            {
                                _pluginContext.Trace($"updating parameter {column.Name} from {value.ToString()} to value {postValue.ToString()}");
                                entity[column.Name] = new Microsoft.Xrm.Sdk.OptionSetValue(int.Parse(postValue.ToString()));
                            }
                        }
                        else //lookup
                        {
                            var table = (column.Value.ToObject() as IDictionary<string, object>)["table"];
                            var preId = (column.Value.ToObject() as IDictionary<string, object>)["id"];
                            //_pluginContext.Trace($"PreValue -- table: {table.ToString()} label: {label.ToString()}, id: {preId.ToString()}");
                            postLabel = engine.Eval($"{column.Name}.label", parameters, opts).ToObject();
                            object postTable = engine.Eval($"{column.Name}.table", parameters, opts).ToObject();
                            object postId = engine.Eval($"{column.Name}.id", parameters, opts).ToObject();
                            //_pluginContext.Trace($"PreValue -- table: {postTable} label: {postLabel}, id: {postId}");

                            if (preId.ToString() != postId.ToString())
                            {
                                _pluginContext.Trace($"updating parameter {column.Name} to id {postId.ToString()}");
                                entity[column.Name] = new EntityReference(postTable.ToString(), new Guid(postId.ToString()));
                            }
                        }
                    }
                    else
                    {
                        //_pluginContext.Trace($"PreValue -- {column.Value.ToObject()}");
                        //_pluginContext.Trace($"PostValue -- {evaluated}");
                        if (evaluated != column.Value.ToObject())
                        {
                            _pluginContext.Trace($"updating parameter {column.Name} to value {evaluated}");
                            entity[column.Name] = column.Value.ToObject();
                        }
                    }
                }
                catch (Exception ex)
                {
                    string msg = $"Exception while comparing parameter values pre and post execution: {ex.Message}";
                    _pluginContext.Trace(msg);
                    throw new InvalidPluginExecutionException(msg);
                }
            }
            return entity;
        }

        string PrintResult(object value, Boolean minimal = false)
        {
            _pluginContext.Trace("Entered PrintResult");
            string resultString;

            if (value is BlankValue)
                resultString = (minimal ? "" : "Blank()");
            else if (value is ErrorValue errorValue)
                resultString = (minimal ? "<error>" : "<Error: " + errorValue.Errors[0].Message + ">");
            else if (value is UntypedObjectValue)
                resultString = (minimal ? "<untyped>" : "<Untyped: Use Value, Text, Boolean, or other functions to establish the type>");
            else if (value is StringValue str)
                resultString = (minimal ? str.ToObject().ToString() : "\"" + str.ToObject().ToString().Replace("\"", "\"\"") + "\"");
            else if (value is RecordValue record)
            {
                if (minimal)
                    resultString = "<record>";
                else
                {
                    var separator = "";
                    resultString = "{";
                    foreach (var field in record.Fields)
                    {
                        resultString += separator + $"{field.Name}:";
                        resultString += PrintResult(field.Value);
                        separator = ", ";
                    }
                    resultString += "}";
                }
            }
            else if (value is TableValue table)
            {
                if (minimal)
                    resultString = "<table>";
                else
                {
                    int[] columnWidth = new int[table.Rows.First().Value.Fields.Count()];

                    foreach (var row in table.Rows)
                    {
                        var column = 0;
                        foreach (var field in row.Value.Fields)
                        {
                            columnWidth[column] = Math.Max(columnWidth[column], PrintResult(field.Value, true).Length);
                            column++;
                        }
                    }

                    // special treatment for single column table named Value
                    if (columnWidth.Length == 1 && table.Rows.First().Value.Fields.First().Name == "Value")
                    {
                        string separator = "";
                        resultString = "[";
                        foreach (var row in table.Rows)
                        {
                            resultString += separator + PrintResult(row.Value.Fields.First().Value);
                            separator = ", ";
                        }
                        resultString += "]";
                    }
                    // table without formatting 
                    else
                    {
                        resultString = "[";
                        string separator = "";
                        foreach (var row in table.Rows)
                        {
                            resultString += separator + PrintResult(row.Value);
                            separator = ", ";
                        }
                        resultString += "]";
                    }
                }
            }
            // must come last, as everything is a formula value
            else if (value is FormulaValue fv)
                resultString = fv.ToObject().ToString();
            else
                throw new Exception("unexpected type in PrintResult");

            return (resultString);
        }
    }
}
