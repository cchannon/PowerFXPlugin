import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { IPickerProps, IListItem, picker } from "./TablePicker";
import * as React from "react";
import { json } from "stream/consumers";

export class contextBuilder implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private _notifyOutputChanged: () => void;
    public _context: ComponentFramework.Context<IInputs>;
    private _newValue: string | undefined;
    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this._notifyOutputChanged = notifyOutputChanged;
        this._context = context;
        if(this._context.parameters.context.raw){
            this._newValue = context.parameters.context.raw!;
        }
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        let props: IPickerProps = { callback: this.callback.bind(this), context}
        return React.createElement(
            picker, props
        );
    }

    public callback(schemaname: string){
        console.log(schemaname);
        this._context.webAPI.retrieveMultipleRecords(schemaname, undefined, 1).then((e) => this.retrieveCallback.bind(this)(e, schemaname), this.errorCallback.bind(this))
    }

    private retrieveCallback(entity: ComponentFramework.WebApi.RetrieveMultipleResponse, schemaname: string){
        let attribs: string[] = [];
        if(entity.entities.length === 0){
            //pop error
            let popService = this._context.factory.getPopupService();
            let popOptions: ComponentFramework.FactoryApi.Popup.Popup = {
                name:"",
                type: ComponentFramework.FactoryApi.Popup.Types.PopupType,
                
            }
            popService.createPopup()
            return;
        }
        Object.entries(entity.entities[0]).forEach(([key, _]) => attribs.push(key));

        //The return object from a RetrieveMultiple when no Select params are attached includes all columns, 
        //but this also includes _value and @odata columns we need to filter out, so this line cleans our set of colnames
        //down to just valid columns for a metadata retrieve
        attribs = attribs.filter(x => !x.match("@")).map(x => x.match("^_") ? x.substring(1,x.length-6) : x);

        this._context.utils.getEntityMetadata(schemaname, attribs).then(this.metadataCallback.bind(this), this.errorCallback.bind(this));
        console.log(entity);
    }

    private metadataCallback(success: ComponentFramework.PropertyHelper.EntityMetadata){
        let attribs: string[] = success._attributes
        let jsonString = "{"
        attribs.forEach(attrib => {
            jsonString +=`\n\t\"${attrib}\": `
            let type = success.Attributes.get(attrib).AttributeTypeName;
            switch(type){
                case 'status':
                case 'state':
                case 'picklist':
                    jsonString +="{\n\t\t\"value\": 12345,\n\t\t\"label\": \"optionsetlabel\"\n\t},";
                    break;
                case 'lookup':
                    jsonString +="{\n\t\t\"value\": \"{A GUID}\",\n\t\t\"label\": \"PrimaryColumnName\"\n\t},";
                    break;
                default:
                    jsonString +=" \"StringValue\",";
                    break;
            }
        });
        jsonString += "}";
        this._newValue = jsonString;
        this._notifyOutputChanged();
    }

    private errorCallback(error: any){
        console.log(error);
    }

    public getOutputs(): IOutputs {
        return { context: this._newValue };
    }

    public destroy(): void {
    }
}
