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
            var query = new QueryExpression("pl_pfxtext");
            query.ColumnSet.AddColumn("pl_pfxstring");
            query.ColumnSet.AddColumn("pl_pfxcontext");
            query.Criteria.AddCondition(new ConditionExpression("pl_pfxtest", ConditionOperator.Equal, pfxRecordId));
            var results = orgService.RetrieveMultiple(query).Entities;
            if(results != null && results.Count>0){
                _pluginContext.Trace("have pfx");
                if(localPluginContext.PluginExecutionContext.InputParameters["Target"] is Entity entity){
                    _pluginContext.Trace("have Target");
                    entityName = entity.LogicalName;
                    var pfxstring = results[0].GetAttributeValue<string>("pl_pfxstring");
                    _pluginContext.Trace($"PFX: {pfxstring}");
                    string global = results[0].GetAttributeValue<string>("pl_pfxcontext");
                    _pluginContext.Trace($"Context: {global}");
                    var parameters = (RecordValue)FormulaValue.FromJson(global);
                    _pluginContext.Trace(parameters.ToString());

                    var config = new PowerFxConfig();
                    config.EnableSetFunction();
                    var engine = new RecalcEngine(config);
                    string[] lines = pfxstring.Split(';');

                    foreach (var line in lines){
                        // variable assignment: Set( <ident>, <expr> )
                        MatchCollection allMatches = Regex.Matches(line, @"\s*Set\(\s*?(?<ident>\w+?)\s*?,\s*?(?<expr>.*?)\)", RegexOptions.Singleline);
                        if(allMatches.Count>0)
                        {
                            foreach(Match thisMatch in allMatches)
                            {
                                try
                                {
                                    var val = engine.GetValue(thisMatch.Groups["ident"].Value);
                                }
                                catch
                                {
                                    var r = engine.Eval(thisMatch.Groups["expr"].Value);
                                    engine.UpdateVariable(thisMatch.Groups["ident"].Value, FormulaValue.NewBlank(r.Type));
                                }
                            }
                        }
                        // eval and print
                        var result = engine.Eval(line);

                        if (result is ErrorValue errorValue)
                            throw new Exception("Error: " + errorValue.Errors[0].Message);
                        else
                        {
                            localPluginContext.Trace(PrintResult(result));
                            
                            
                            //Do Stuff to eval and update:


                        }
                    }
                }
            }
        }

        Entity contextComparison(Dictionary<string, FormulaValue> Pre, Dictionary<string, FormulaValue> Post) {
            Entity entity = new Entity(entityName);
            foreach(var column in Pre){
                if(Pre[column.Key].Type != Post[column.Key].Type){
                    throw new InvalidCastException($"Type casting for dataverse columns is not allowed. Attempted to set {Pre[column.Key]} with type {Pre[column.Key].Type} as {Post[column.Key].Type}");
                }
                if(Pre[column.Key] != Post[column.Key]){
                    entity[column.Key] = Post[column.Key];
                }
            }
            return entity;
        }

        void updateColumn(string column, Microsoft.PowerFx.Types.FormulaValue value){

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
