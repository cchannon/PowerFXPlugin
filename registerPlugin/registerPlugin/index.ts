import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { IRegistrationProps, RegisterForm } from "./RegisterForm";
import * as React from "react";
import { ContextObj } from "./models";

export class registerPlugin implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private _notifyOutputChanged: () => void;
    private _jsonObj: ContextObj
    private _context: ComponentFramework.Context<IInputs>;
    private _stage: string;
    private _mode: string;
    private _filteringAttributes: string[];
    private _sdkMessageId: string;
    private _sdkMessageFilterId: string;
    private _pluginTypeId: string;

    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this._notifyOutputChanged = notifyOutputChanged;
        this._context = context;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        if(context.parameters.context.raw){
            this._jsonObj = JSON.parse(context.parameters.context.raw!)
        }
        const props: IRegistrationProps = { 
            jsonObj: this._jsonObj,
            registered: context.parameters.registered.raw,
            callback: this.callback.bind(this)
        };
        return React.createElement(
            RegisterForm, props
        );
        
    }

    public callback (filteringAttributes: string[], stage: string, mode: string, sdkMessage:string){
        this._stage = stage;
        this._mode = mode;
        this._filteringAttributes = filteringAttributes;
        let options = `?$select=sdkmessageid&$expand=sdkmessageid_sdkmessagefilter($select=sdkmessagefilterid;$filter=(primaryobjecttypecode eq ${this._jsonObj.tableName}))&$filter=(name eq '${sdkMessage}')`;
        this._context.webAPI.retrieveMultipleRecords("sdkmessage", options).then(this.sdkMessageCallback.bind(this), this.errorCallback)
    }

    private errorCallback(error:any) {
        console.log(error);
    }

    private sdkMessageCallback(success: ComponentFramework.WebApi.RetrieveMultipleResponse) {
        this._sdkMessageId = success.entities[0]["sdkmessageid"];
        this._sdkMessageFilterId = success.entities[0]["sdkmessagefilterid"]?success.entities[0]["sdkmessagefilterid"]: null;
        let options = `?$select=plugintypeid&$filter=(name eq '${this._context.parameters.plugin.raw}')`;
        this._context.webAPI.retrieveMultipleRecords("plugintype", options).then(this.pluginTypeCallback.bind(this), this.errorCallback);
    }

    private pluginTypeCallback(success: ComponentFramework.WebApi.RetrieveMultipleResponse){
        this._pluginTypeId = success.entities[0]["plugintypeid"];
        let pluginStep : ComponentFramework.WebApi.Entity = {
            filteringattributes : this._filteringAttributes.join(','),
            mode: this._mode === "Asynchronous" ? 1 : 0,
            stage: this._stage === "Pre-validation" ? 10 : this._stage === "Pre-operation" ? 20 : 40,
            supporteddeployment: 0,
            invocationsource: 1,
            description: "PowerFX Plugin",
            name: "PowerFX Plugin",
            rank: 10,
            plguintypeid: this._pluginTypeId,
            sdkmessageid: this._sdkMessageId,
            sdkmessagefilterid: this._sdkMessageFilterId
        }
        
        this._context.webAPI.createRecord("sdkmessageprocessingstep", pluginStep).then(this.registerCallback.bind(this), this.errorCallback);
    }

    private registerCallback(success: ComponentFramework.LookupValue){
        console.log(success);
    }
    
    public getOutputs(): IOutputs {
        return { };
    }

    public destroy(): void {
    }
}
