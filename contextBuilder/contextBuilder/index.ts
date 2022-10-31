import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { IPickerProps, IListItem, picker } from "./TablePicker";
import * as React from "react";

export class contextBuilder implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void;
    private _tables: Promise<ComponentFramework.WebApi.RetrieveMultipleResponse>;
    private _context: ComponentFramework.Context<IInputs>;
    private _newValue: string | null;

    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
        this._context = context;
        this._newValue = context.parameters.context.raw;
        this._tables = context.webAPI.retrieveMultipleRecords("entity", "?$select=originallocalizedcollectionname,logicalname&$filter=originallocalizedcollectionname ne null");
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {

        //using this static test set for local testing only
        let items: IListItem[] = [
            {
                key:1,
                setName:"set1"  ,
                schemaName:"schema1"
            },
            {
                key:2,
                setName:"set2"  ,
                schemaName:"schema2"
            }
        ]
        const props: IPickerProps = { callback:this.callback, options:items };
        return React.createElement(
            picker, props
        );
    }

    public callback(schemaname: string){
        console.log(schemaname);
        let options: ComponentFramework.UtilityApi.LookupOptions = {
            allowMultiSelect: false,
            defaultEntityType: schemaname,
            entityTypes: [schemaname],
            defaultViewId: "",
            viewIds: []
        }
        this._context.utils.lookupObjects(options).then(
            function(success){
                console.log(success)
            },function(error){
                console.log(error)
            }
        )
    }

    public getOutputs(): IOutputs {
        return { };
    }

    public destroy(): void {
    }
}
