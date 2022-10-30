using Microsoft.Xrm.Sdk;
using System;
using Microsoft.PowerFx;
using Microsoft.PowerFx.Types;
using Microsoft.PowerFx.Core;
using System.Linq;
using Microsoft.Xrm.Sdk.Query;

namespace pfxPlugin
{
    public class Plugin1 : PluginBase
    {
        private string pfxRecordId = null;
        private ILocalPluginContext _pluginContext;
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

            if(localPluginContext.PluginExecutionContext.InputParameters["Target"] is Entity entity){
                _pluginContext.Trace("have Target");
                var pfxstring = entity.GetAttributeValue<string>("pl_pfxstring");
                _pluginContext.Trace($"pl_pfxstring: {pfxstring}");
                string global = "{\"A\":\"ABC\",\"B\":{\"Inner\":123}}";
                //_pluginContext.Trace(global);
                var parameters = (RecordValue)FormulaValue.FromJson(global);
                _pluginContext.Trace(parameters.ToString());
                var config = new PowerFxConfig();
                var engine = new RecalcEngine(config);
                
                var result = engine.Eval(pfxstring, parameters);

                localPluginContext.Trace(PrintResult(result));                
            }
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
