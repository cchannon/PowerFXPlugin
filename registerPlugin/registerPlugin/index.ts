import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import {IRegProps, RegisterForm} from "./registrationForm";
import * as Register from "./registrationModel";
import { getuid } from "process";

export class registerplugin implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private theComponent: ComponentFramework.ReactControl<IInputs, IOutputs>;
    private notifyOutputChanged: () => void;
    private _context: ComponentFramework.Context<IInputs>;
    private registration: Register.step;
    private _sdkMessageId: string;
    private _sdkMessageFilterId: string;
    private _pluginTypeId: string;
    private _pluginStepUpdate: string;

    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        this._context = context;
        const props: IRegProps = { 
            pluginName: context.parameters.plugin.raw, 
            stepId: context.parameters.pluginStep.raw,
            webApi: context.webAPI,
            callback: this.callback.bind(this)
        };
        return React.createElement(
            RegisterForm, props
        );
    }

    public callback(registration: Register.step){
        this.registration = registration;
        let options = `?$select=sdkmessageid&$expand=sdkmessageid_sdkmessagefilter($select=sdkmessagefilterid;$filter=(primaryobjecttypecode eq '${registration.primaryTable}'))&$filter=(name eq '${registration.SdkMessage}')`;
        this._context.webAPI.retrieveMultipleRecords("sdkmessage", options).then((success) => {this.sdkMessageCallback(success)}, (error) => {this.errorCallback(error)});
    }

    private errorCallback(error:any) {
        //should alert error with a modal
        console.log(error);
    }

    private sdkMessageCallback(success: ComponentFramework.WebApi.RetrieveMultipleResponse) {
        this._sdkMessageId = success.entities[0]["sdkmessageid"];
        this._sdkMessageFilterId = success.entities[0].sdkmessageid_sdkmessagefilter?success.entities[0].sdkmessageid_sdkmessagefilter[0].sdkmessagefilterid: null;
        let options = `?$select=plugintypeid&$filter=(name eq '${this._context.parameters.plugin.raw}')`;
        this._context.webAPI.retrieveMultipleRecords("plugintype", options).then((success) => {this.pluginTypeCallback(success)}, (error) => {this.errorCallback(error)});
    }

    private pluginTypeCallback(success: ComponentFramework.WebApi.RetrieveMultipleResponse){
        this._pluginTypeId = success.entities[0]["plugintypeid"];
        let pluginStep = {
            "filteringattributes" : this.registration.filterAttributes.join(','),
            "mode": this.registration.Mode === "Asynchronous" ? 1 : 0,
            "stage": this.registration.Stage === "Pre-validation" ? 10 : this.registration.Stage === "Pre-operation" ? 20 : 40,
            "supporteddeployment": 0,
            "invocationsource": 1,
            "description": this.registration.description,
            "name": this.registration.StepName,
            "rank": this.registration.executionOrder,
            "configuration": this.registration.unsecureConfig,
            "plugintypeid@odata.bind": `/plugintypes(${this._pluginTypeId})`,
            "sdkmessageid@odata.bind": `/sdkmessages(${this._sdkMessageId})`,
            "sdkmessagefilterid@odata.bind": `/sdkmessagefilters(${this._sdkMessageFilterId})`
        }
        if(this.registration.Id){
            this._context.webAPI.updateRecord("sdkmessageprocessingstep", this.registration.Id, pluginStep).then((success) => {this.registerCallback(success)}, (error) => {this.errorCallback(error)});
        }
        else{
            this._context.webAPI.createRecord("sdkmessageprocessingstep", pluginStep).then((success) => {this.registerCallback(success)}, (error) => {this.errorCallback(error)});
        }
    }

    private registerCallback(success: ComponentFramework.LookupValue){
        //should alert success with a modal
        this._pluginStepUpdate = success.id;
        this.notifyOutputChanged();
    }

    public getOutputs(): IOutputs {
        return { pluginStep: this._pluginStepUpdate };
    }

    public destroy(): void {
        // Add code to cleanup control if necessary
    }
}
