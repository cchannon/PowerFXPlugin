using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using System;
using Microsoft.PowerFx;
using Microsoft.PowerFx.Types;
using System.Linq;
using Microsoft.Xrm.Sdk.Query;
using System.Collections.Generic;
using System.Text.Json;
using Microsoft.Xrm.Sdk.Metadata;

namespace pfxPlugin
{
    public class Plugin1 : PluginBase
    {
        #region global parameters and unsecureconfig reading
        private string pfxRecordId = null;
        private ILocalPluginContext _pluginContext;
        private ParserOptions opts;
        private RecalcEngine engine;
        private List<StartMap> preExecutionValues = new List<StartMap>();
        AttributeMetadata[] attributeMetadata;
        private readonly List<string> reservedColumns = new List<string>(){
            "createdon","createdby","modifiedon","modifiedby","timezoneruleversionnumber","versionnumber","importsequencenumber","utcconversiontimezonecode"
        };

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

                if (_pluginContext.PluginExecutionContext.InputParameters["Target"] is Entity target)
                {
                    #region declare all variables before Evaluating Pfx
                    Entity preImage = !_pluginContext.PluginExecutionContext.PreEntityImages.Contains("PreImage")
                        ? throw new InvalidPluginExecutionException("No PreImage with the name PreImage was found registered on this Plugin Command. Please check the step registration and correctly register the image with all attributes.")
                        : _pluginContext.PluginExecutionContext.PreEntityImages["PreImage"];

                    var entityMetadataRequest = new RetrieveEntityRequest
                    {
                        EntityFilters = EntityFilters.Attributes,
                        LogicalName = target.LogicalName
                    };

                    EntityMetadata metadataResponse = (EntityMetadata)orgService.Execute(entityMetadataRequest).Results.FirstOrDefault().Value;

                    attributeMetadata = metadataResponse.Attributes;

                    foreach (var attrib in attributeMetadata)
                    {
                        _pluginContext.Trace($"Found Var {attrib.LogicalName}");
                        _pluginContext.Trace($"Target Contains Key: {target.Attributes.ContainsKey(attrib.LogicalName)}");
                        Entity source = null;
                        if (target.Attributes.ContainsKey(attrib.LogicalName))
                            source = target;
                        else if (preImage.Attributes.ContainsKey(attrib.LogicalName))
                            source = preImage;
                        DeclareVariable(source, attrib.LogicalName);
                    }
                    #endregion

                    #region Find and evaluate pfx
                    var query = new QueryExpression("ktcs_plugincommand");
                    query.ColumnSet.AddColumns(new string[] { "ktcs_command", "ktcs_formulas", "ktcs_functions" });
                    query.Criteria.AddCondition(new ConditionExpression("ktcs_plugincommandid", ConditionOperator.Equal, pfxRecordId));
                    var results = orgService.RetrieveMultiple(query).Entities;

                    if (results != null && results.Count > 0)
                    {
                        var pfxstring = results[0].GetAttributeValue<string>("ktcs_command");
                        string[] lines = pfxstring.Split(';');
                        _pluginContext.Trace($"{lines.Count()} commands found.");
                        foreach (var line in lines)
                        {
                            if (line == "")
                                continue;
                            var result = engine.Eval(line, null, opts);

                            if (result is ErrorValue errorValue)
                                throw new InvalidPluginExecutionException("Error in PowerFX Evaluation: " + errorValue.Errors[0].Message);
                            else
                            {
                                localPluginContext.Trace($"Non-Behavior Eval Output: {PrintResult(result)}");
                            }
                        }
                        #endregion

                        //inject updates into Target
                        AttributeCollection update = CompareContext();
                        if (update != null && update.Count() > 0)
                        {
                            foreach(var attrib in update)
                            {
                                _pluginContext.Trace($"{attrib.Key} : {attrib.Value}");
                                target[attrib.Key] = attrib.Value;
                            }
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

        private AttributeCollection CompareContext()
        {
            AttributeCollection update = new AttributeCollection();
            preExecutionValues.ForEach(x =>
            {
                var attributeType = attributeMetadata.Where(y => y.LogicalName == x.Attrib).FirstOrDefault().AttributeType;

                if (reservedColumns.Contains(x.Attrib))
                {
                    //Do not attempt to update columns in the reserved list.
                    //Maybe we should throw() instead? a quiet fail does seem a bit wrong...
                    return;
                }
                if (x.Value.ToObject() != engine.Eval(x.Attrib).ToObject())
                {
                    _pluginContext.Trace($"Value Update detected in {x.Attrib}");

                    switch (attributeType)
                    {
                        case AttributeTypeCode.Boolean:
                            update.Add(new KeyValuePair<string, object>(x.Attrib, (bool)engine.Eval(x.Attrib).ToObject()));
                            break;
                        case AttributeTypeCode.DateTime:
                            update.Add(new KeyValuePair<string, object>(x.Attrib, (DateTime)engine.Eval(x.Attrib).ToObject()));
                            break;
                        case AttributeTypeCode.String:
                        case AttributeTypeCode.Memo:
                            update.Add(new KeyValuePair<string, object>(x.Attrib, engine.Eval(x.Attrib).ToObject().ToString()));
                            break;
                        case AttributeTypeCode.Integer:
                        case AttributeTypeCode.BigInt:
                            update.Add(new KeyValuePair<string, object>(x.Attrib, (int)engine.Eval(x.Attrib).ToObject()));
                            break;
                        case AttributeTypeCode.Decimal:
                        case AttributeTypeCode.Double:
                        case AttributeTypeCode.Money:
                            update.Add(new KeyValuePair<string, object>(x.Attrib, (double)engine.Eval(x.Attrib).ToObject()));
                            break;
                        case AttributeTypeCode.Lookup:
                        case AttributeTypeCode.Owner:
                        case AttributeTypeCode.Customer:
                            update.Add(
                                new KeyValuePair<string, object>(
                                    x.Attrib,
                                    new EntityReference(
                                        engine.Eval($"{x.Attrib}.LogicalName").ToObject().ToString(),
                                        new Guid(engine.Eval($"{x.Attrib}.Id").ToObject().ToString())
                                    )
                                )
                            );
                            break;
                        case AttributeTypeCode.Picklist:
                        case AttributeTypeCode.State:
                        case AttributeTypeCode.Status:
                            update.Add(
                                new KeyValuePair<string, object>(
                                    x.Attrib,
                                    new Microsoft.Xrm.Sdk.OptionSetValue((int)(double)engine.Eval(x.Attrib).ToObject())
                                )
                            );
                            break;
                    }
                }
            });
            _pluginContext.Trace($"returning Update Collection with count: {update.Count}");
            return update;
        }

        private void DeclareVariable(Entity source, string attrib)
        {
            #region no value was found in target or preimage
            //meaning we need to instantiate a new Blank of the right type from metatdata request
            if (source == null)
            {
                foreach(var attr in  attributeMetadata.Where(x => x.LogicalName == attrib))
                {
                    switch (attr.AttributeType)
                    {
                        case AttributeTypeCode.Lookup:
                        case AttributeTypeCode.Owner:
                        case AttributeTypeCode.Customer:
                            //Working with the PowerFX Team on this in Github right now:
                            //There are a few things that cause issues with managing Record type objects, including:
                            //- The available Packages on Nuget for Microsoft.PowerFX.Core are behind the ACTUAL latest, and you need to pull from their own Nuget stream
                            //- The Patch function has some quirks in the core language, and while there are three overloads for it, none of them really work exactly as you'd expect
                            // So, some work continues, but I will update this code, and these notes, as soon as I figure out how to properly handly mutation functions on Record Type objects
                            // If you want to keep posted, watch the discussion here: https://github.com/microsoft/Power-Fx/discussions/889

                            //not sure this is going to work. Need to test this.
                            //-- nope. doesn't work.
                            //engine.UpdateVariable(attrib, FormulaValue.NewBlank(FormulaType.UntypedObject));
                            //preExecutionValues.Add(new StartMap(attrib, FormulaValue.NewBlank(FormulaType.UntypedObject)));
                            break;
                        case AttributeTypeCode.String:
                        case AttributeTypeCode.Memo:
                            engine.UpdateVariable(attrib, FormulaValue.NewBlank(FormulaType.String));
                            preExecutionValues.Add(new StartMap(attrib, FormulaValue.NewBlank(FormulaType.String)));
                            break;
                        case AttributeTypeCode.Boolean:
                            engine.UpdateVariable(attrib, FormulaValue.NewBlank(FormulaType.Boolean));
                            preExecutionValues.Add(new StartMap(attrib, FormulaValue.NewBlank(FormulaType.Boolean)));
                            break;
                        case AttributeTypeCode.DateTime:
                            engine.UpdateVariable(attrib, FormulaValue.NewBlank(FormulaType.DateTime));
                            preExecutionValues.Add(new StartMap(attrib, FormulaValue.NewBlank(FormulaType.DateTime)));
                            break;
                        case AttributeTypeCode.BigInt:
                        case AttributeTypeCode.Integer:
                        case AttributeTypeCode.Decimal:
                        case AttributeTypeCode.Double:
                        case AttributeTypeCode.Money:
                        case AttributeTypeCode.Picklist:
                        case AttributeTypeCode.State:
                        case AttributeTypeCode.Status:
                            engine.UpdateVariable(attrib, FormulaValue.NewBlank(FormulaType.Number));
                            preExecutionValues.Add(new StartMap(attrib, FormulaValue.NewBlank(FormulaType.Number)));
                            break;
                    }
                }
            }
            #endregion

            #region declare vars with value from Target or PreImage, as appropriate
            else if (source[attrib].GetType() == typeof(string))
            {
                _pluginContext.Trace("type: string");
                engine.UpdateVariable(attrib, FormulaValue.New((string)source[attrib]));
                preExecutionValues.Add(new StartMap(attrib, FormulaValue.New((string)source[attrib])));
            }
            else if (source[attrib].GetType() == typeof(bool))
            {
                _pluginContext.Trace("type: bool");
                engine.UpdateVariable(attrib, FormulaValue.New((bool)source[attrib]));
                preExecutionValues.Add(new StartMap(attrib, FormulaValue.New((bool)source[attrib])));
            }
            else if (source[attrib].GetType() == typeof(EntityReference))
            {
                _pluginContext.Trace("type: EntityRef");
                engine.UpdateVariable(attrib, FormulaValue.FromJson(
                    JsonSerializer.Serialize(
                        new EntityRefObj(
                            ((EntityReference)source[attrib]).Id.ToString(),
                            ((EntityReference)source[attrib]).Name,
                            ((EntityReference)source[attrib]).LogicalName)
                        )
                    )
                );
                preExecutionValues.Add(new StartMap(
                    attrib, FormulaValue.FromJson(
                        JsonSerializer.Serialize(
                            new EntityRefObj(
                                ((EntityReference)source[attrib]).Id.ToString(),
                                ((EntityReference)source[attrib]).Name,
                                ((EntityReference)source[attrib]).LogicalName)
                            )
                        )
                    )
                );
            }
            else if (source[attrib].GetType() == typeof(Microsoft.Xrm.Sdk.OptionSetValue))
            {
                _pluginContext.Trace("type: Optionset");
                engine.UpdateVariable(attrib, ((Microsoft.Xrm.Sdk.OptionSetValue)source[attrib]).Value);
                preExecutionValues.Add(new StartMap(
                    attrib, 
                    FormulaValue.New(((Microsoft.Xrm.Sdk.OptionSetValue)source[attrib]).Value)));
            }
            else if (source[attrib].GetType() == typeof(DateTime))
            {
                _pluginContext.Trace("type: DateTime");
                engine.UpdateVariable(attrib, FormulaValue.New(((DateTime)source[attrib]).ToLocalTime()));
                preExecutionValues.Add(new StartMap(
                    attrib, 
                    FormulaValue.New(((DateTime)source[attrib]).ToLocalTime())));
            }
            else if (source[attrib].GetType() == typeof(int))
            {
                _pluginContext.Trace("type: int");
                engine.UpdateVariable(attrib, FormulaValue.New((int)source[attrib]));
                preExecutionValues.Add(new StartMap(attrib, FormulaValue.New((int)source[attrib])));
            }
            else if (source[attrib].GetType() == typeof(decimal)
                || source[attrib].GetType() == typeof(float)
                || source[attrib].GetType() == typeof(double))
            {
                _pluginContext.Trace("type: decimal");
                engine.UpdateVariable(attrib, FormulaValue.New((double)source[attrib]));
                preExecutionValues.Add(new StartMap(attrib, FormulaValue.New((double)source[attrib])));
            }
            #endregion
        }

        string PrintResult(object value, Boolean minimal = false)
        {
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
        public EntityRefObj(string id, string name, string logicalName)
        {
            Id = id;
            Name = name;
            LogicalName = logicalName;
        }
        public string Id { get; set; }
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
