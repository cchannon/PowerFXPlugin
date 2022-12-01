using Microsoft.Xrm.Sdk;
using System;
using Microsoft.PowerFx;
using Microsoft.PowerFx.Types;
using Microsoft.PowerFx.Core;
using System.Linq;
using Microsoft.Xrm.Sdk.Query;
using System.Collections.Generic;
using System.Text.Json;

namespace pfxPlugin
{
    public class Plugin1 : PluginBase
    {
        #region global parameters and unsecureconfig reading
        private string pfxRecordId = null;
        private ILocalPluginContext _pluginContext;
        private string entityName;
        private Guid entityId;
        private ParserOptions opts;
        private readonly List<string> reservedColumns = new List<string>(){
            "createdon","createdby","modifiedon","modifiedby","timezoneruleversionnumber","versionnumber","importsequencenumber","utcconversiontimezonecode"
        };
        private RecalcEngine engine;
        private List<StartMap> preExecutionValues;
        private Entity preImage;

        public Plugin1(string unsecureConfiguration, string secureConfiguration)
            : base(typeof(Plugin1))
        {
            if(unsecureConfiguration != null){
                pfxRecordId = unsecureConfiguration;
            }
        }
        #endregion

        protected override void ExecuteDataversePlugin(ILocalPluginContext localPluginContext)
        {
            try
            {

                #region parameters and Engine instantiation
                _pluginContext = localPluginContext ?? throw new ArgumentNullException(nameof(localPluginContext));
                IOrganizationService orgService = _pluginContext.InitiatingUserService;

                var config = new PowerFxConfig();
                config.EnableSetFunction();
                opts = new ParserOptions { AllowsSideEffects = true };

                engine = new RecalcEngine(config);
                var symbol = new SymbolTable();
                symbol.EnableMutationFunctions();
                engine.Config.SymbolTable = symbol;
                #endregion

                if (_pluginContext.PluginExecutionContext.InputParameters["Target"] is Entity entity)
                {
                    #region declare all variables before Evaluating Pfx
                    preImage = !_pluginContext.PluginExecutionContext.PreEntityImages.Contains("PreImage")
                        ? throw new InvalidPluginExecutionException("No PreImage with the name PreImage was found registered on this Plugin Command. Please check the step registration and correctly register the image with all attributes.")
                        : _pluginContext.PluginExecutionContext.PreEntityImages["PreImage"];
                    
                    foreach (var attrib in preImage.Attributes.ToList())
                    {   
                        Entity source = entity.Attributes.ContainsKey(attrib.Key) ? entity : preImage;
                        DeclareVariable(source, attrib);
                    }
                    #endregion

                    #region Find and eval pfx
                    var query = new QueryExpression("ktcs_plugincommand");
                    query.ColumnSet.AddColumns(new string[] { "ktcs_command", "ktcs_context", "ktcs_formulas", "ktcs_functions" });
                    query.Criteria.AddCondition(new ConditionExpression("ktcs_plugincommandid", ConditionOperator.Equal, pfxRecordId));
                    var results = orgService.RetrieveMultiple(query).Entities;

                    if (results != null && results.Count > 0)
                    {
                        entityName = entity.LogicalName;
                        var pfxstring = results[0].GetAttributeValue<string>("ktcs_command");
                        _pluginContext.Trace($"PFX: {pfxstring}");
                        //string global = results[0].GetAttributeValue<string>("ktcs_context");


                        string[] lines = pfxstring.Split(';');
                        _pluginContext.Trace($"{lines.Count()} commands found.");
                        foreach (var line in lines)
                        {
                            var result = engine.Eval(line, null, opts);

                            if (result is ErrorValue errorValue)
                                throw new InvalidPluginExecutionException("Error: " + errorValue.Errors[0].Message);
                            else
                            {
                                localPluginContext.Trace($"Non-Behavior Eval Output: {PrintResult(result)}");
                            }
                        }
                        #endregion

                        Entity update = CompareContext();
                        if (update.Attributes.Count > 0)
                        {
                            orgService.Update(update);
                        }
                        else
                        {
                            _pluginContext.Trace("No attributes in the context object were modified. Bypassing record update");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _pluginContext.Trace($"Exception in PFX Plugin: {ex.Message}");
                throw;
            }
        }

        private Entity CompareContext()
        {
            Entity update = new Entity(entityName, entityId);
            preExecutionValues.ForEach(x =>
            {
                if (!reservedColumns.Contains(x.Attrib))
                {
                    if (x.Value != engine.Eval(x.Attrib))
                    {
                        if (preImage[x.Attrib].GetType() == typeof(EntityReference))
                        {
                            update.Attributes[x.Attrib] = new EntityReference(
                                (string)((RecordValue)engine.Eval(x.Attrib)).Fields.ToList().Where(y => y.Name == "LogicalName").FirstOrDefault().Value.ToObject(),
                                (Guid)((RecordValue)engine.Eval(x.Attrib)).Fields.ToList().Where(y => y.Name == "LogicalName").FirstOrDefault().Value.ToObject()
                            );
                        }
                        else if (preImage[x.Attrib].GetType() == typeof(Microsoft.Xrm.Sdk.OptionSetValue))
                        {
                            update.Attributes[x.Attrib] = new Microsoft.Xrm.Sdk.OptionSetValue((int)engine.Eval(x.Attrib).ToObject());
                        }
                        else
                        {
                            var thing = engine.Eval(x.Attrib).ToObject();
                            update.Attributes[x.Attrib] = engine.Eval(x.Attrib).ToObject();
                        }
                    }
                }
                else
                {
                    _pluginContext.Trace($"{x.Attrib} is considered a Reserved column and will not be updated by the PowerFX Plugin Command.");
                }
            });
            return update;
        }

        private void DeclareVariable(Entity source, KeyValuePair<string, object> attrib)
        {
            if (source[attrib.Key].GetType() == typeof(string))
            {
                engine.UpdateVariable(attrib.Key, FormulaValue.New((string)source[attrib.Key]));
                preExecutionValues.Add(new StartMap(attrib.Key, FormulaValue.New((string)source[attrib.Key])));
            }
            else if (attrib.Value.GetType() == typeof(bool))
            {
                engine.UpdateVariable(attrib.Key, FormulaValue.New((bool)source[attrib.Key]));
                preExecutionValues.Add(new StartMap(attrib.Key, FormulaValue.New((bool)source[attrib.Key])));
            }
            else if (source[attrib.Key].GetType() == typeof(EntityReference))
            {
                engine.UpdateVariable(attrib.Key, FormulaValue.FromJson(
                    JsonSerializer.Serialize(
                        new EntityRefObj(
                            ((EntityReference)source[attrib.Key]).Id,
                            ((EntityReference)source[attrib.Key]).Name,
                            ((EntityReference)source[attrib.Key]).LogicalName)
                        )
                    )
                );
                preExecutionValues.Add(new StartMap(
                    attrib.Key, FormulaValue.FromJson(
                        JsonSerializer.Serialize(
                            new EntityRefObj(
                                ((EntityReference)source[attrib.Key]).Id,
                                ((EntityReference)source[attrib.Key]).Name,
                                ((EntityReference)source[attrib.Key]).LogicalName)
                            )
                        )
                    )
                );
            }
            else if (source[attrib.Key].GetType() == typeof(Microsoft.Xrm.Sdk.OptionSetValue))
            {
                engine.UpdateVariable(attrib.Key, ((Microsoft.Xrm.Sdk.OptionSetValue)source[attrib.Key]).Value);
                preExecutionValues.Add(new StartMap(
                    attrib.Key, 
                    FormulaValue.New(((Microsoft.Xrm.Sdk.OptionSetValue)source[attrib.Key]).Value)));
            }
            else if (source[attrib.Key].GetType() == typeof(DateTime))
            {
                engine.UpdateVariable(attrib.Key, FormulaValue.New(((DateTime)source[attrib.Key]).ToLocalTime()));
                preExecutionValues.Add(new StartMap(
                    attrib.Key, 
                    FormulaValue.New(((DateTime)source[attrib.Key]).ToLocalTime())));
            }
            else if (attrib.Value.GetType() == typeof(int))
            {
                engine.UpdateVariable(attrib.Key, FormulaValue.New((int)source[attrib.Key]));
                preExecutionValues.Add(new StartMap(attrib.Key, FormulaValue.New((int)source[attrib.Key])));
            }
            else if (source[attrib.Key].GetType() == typeof(decimal)
                || source[attrib.Key].GetType() == typeof(float)
                || source[attrib.Key].GetType() == typeof(double))
            {
                engine.UpdateVariable(attrib.Key, FormulaValue.New((double)source[attrib.Key]));
                preExecutionValues.Add(new StartMap(attrib.Key, FormulaValue.New((double)source[attrib.Key])));
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

    public class EntityRefObj
    {
        public EntityRefObj(Guid id, string name, string logicalName)
        {
            Id = id;
            Name = name;
            LogicalName = logicalName;
        }
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string LogicalName { get; set; }

        public static explicit operator EntityRefObj(FormulaValue v)
        {
            throw new NotImplementedException();
        }
    }
    public class StartMap
    {
        public StartMap(string attrib, FormulaValue value)
        {
            Attrib = attrib;
            Value = value;
        }
        public string Attrib { get; set; }
        public FormulaValue Value { get; set; }
    }
}
