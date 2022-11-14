using Microsoft.Xrm.Sdk;
using System;
using Microsoft.PowerFx;
using Microsoft.PowerFx.Types;
using Microsoft.PowerFx.Core;
using System.Linq;
using Microsoft.Xrm.Sdk.Query;
using System.Text.RegularExpressions;
using System.Collections.Generic;

namespace pfxPlugin
{
    public class Plugin1 : PluginBase
    {
        private string pfxRecordId = null;
        private ILocalPluginContext _pluginContext;
        private IOrganizationService orgService;
        private string entityName;
        public Plugin1(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(Plugin1))
        {
            if(unsecureConfiguration != null){
                pfxRecordId = unsecureConfiguration;
            }
        }

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            localPluginContext.Trace("Begin");
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
                _pluginContext.Trace("have pfx");
                if(localPluginContext.PluginExecutionContext.InputParameters["Target"] is Entity entity){
                    _pluginContext.Trace("have Target");
                    entityName = entity.LogicalName;
                    var pfxstring = results[0].GetAttributeValue<string>("ktcs_command");
                    _pluginContext.Trace($"PFX: {pfxstring}");
                    string global = results[0].GetAttributeValue<string>("ktcs_context");
                    _pluginContext.Trace($"Have Context. Len: {global.Length}");
                    var parameters = (RecordValue)FormulaValue.FromJson(global);
                    var config = new PowerFxConfig();
                    config.EnableSetFunction();
                    ParserOptions opts = new ParserOptions { AllowsSideEffects = true };

                    var engine = new RecalcEngine(config);
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
                }
            }
        }

        Entity contextComparison(RecordValue Pre, RecalcEngine engine, Guid id) {
            Entity entity = new Entity(entityName, id);
            foreach(var column in Pre.Fields.ToList()){
                try{
                    if(column.Value.Type != engine.GetValue(column.Name).Type){
                        //I don't think this is actually possible--I think .Eval would throw an ex earlier if this was ever attempted--but no harm in double-checking.
                        throw new InvalidCastException($"Type re-casting for context parameters is not allowed. Attempted to set {column.Name} with type {column.Value.Type} as {engine.GetValue(column.Name).Type}");
                    }
                    if(engine.GetValue(column.Name) != column.Value){
                        _pluginContext.Trace($"updating parameter {column.Name} to value {engine.GetValue(column.Name)}");
                        entity[column.Name] = column.Value.ToObject();
                    }
                }
                catch(Exception ex){
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
