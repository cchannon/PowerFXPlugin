import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { IPickerProps, picker } from "./TablePicker";
import * as React from "react";

export class contextBuilder implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private _notifyOutputChanged: () => void;
    public _context: ComponentFramework.Context<IInputs>;
    private _newValue: string | undefined;
    private _tableName: string | null;

    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this._notifyOutputChanged = notifyOutputChanged;
        this._context = context;
        this._tableName = context.parameters.tableName.raw;
        if(this._context.parameters.context.raw){
            this._newValue = context.parameters.context.raw!;
        }
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        let props: IPickerProps = { callback: this.callback.bind(this), context: context, prefilter: context.parameters.tableName.raw }
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
            return;
        }
        Object.entries(entity.entities[0]).forEach(([key, _]) => attribs.push(key));

        //The return object from a RetrieveMultiple when no Select params are attached includes all columns, 
        //but this also includes _value and @odata columns we need to filter out, so this line cleans our set of colnames
        //down to just valid columns for a metadata retrieve
        attribs = attribs.filter(x => !x.match("@")).map(x => x.match("^_") ? x.substring(1,x.length-6) : x);

        this._context.utils.getEntityMetadata(schemaname, attribs).then((success) => this.metadataCallback(success, schemaname), this.errorCallback.bind(this));
        console.log(entity);
    }

    private metadataCallback(success: ComponentFramework.PropertyHelper.EntityMetadata, schemaname: string){
        //successful metadata request: start building JSON object
        let attribs: string[] = success._attributes
        let obj: {[name: string]: {}} = {};

        attribs.forEach(attrib => {
            let type = success.Attributes.get(attrib).AttributeTypeName;
            switch(type){
                case 'status':
                case 'state':
                case 'picklist':
                    obj[attrib] = { label: "Optionset Label", value: 123245 };
                    break;
                case 'lookup':
                    obj[attrib] = { table: "Schemaname", label: "Primary Column String", id: "GUID" };
                    break;
                case 'integer':
                case 'bigint':
                case 'decimal':
                    obj[attrib] = 12345;
                    break;
                default:
                    obj[attrib] = "String Value";
                    break;
            }
        });
        
        this._newValue = JSON.stringify(obj, undefined, 5);
        this._tableName = schemaname;
        this._notifyOutputChanged();
    }

    private createAttrib<N extends string, V extends {}>(keyname: N, val: V) {
        return { [keyname]: val } as Record<N,V>;
    }

    private errorCallback(error: any){
        console.log(error);
    }

    public getOutputs(): IOutputs {
        return { context: this._newValue, tableName: this._tableName ?? undefined };
    }

    public destroy(): void {
    }
}