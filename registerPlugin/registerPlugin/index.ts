import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import {IRegProps, RegisterForm} from "./registrationForm";
import * as Register from "./registrationModel";

export class registerplugin implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private theComponent: ComponentFramework.ReactControl<IInputs, IOutputs>;
    private notifyOutputChanged: () => void;
    private _context: ComponentFramework.Context<IInputs>;

    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const props: IRegProps = { 
            assemblyName: context.parameters.pluginAssembly.raw, 
            stepId: context.parameters.pluginStep.raw,
            webApi: context.webAPI,
            callback: this.callback.bind(this)
        };
        return React.createElement(
            RegisterForm, props
        );
    }

    public callback(registration: Register.step){
        //callback logic goes here
    }

    public getOutputs(): IOutputs {
        return { };
    }

    public destroy(): void {
        // Add code to cleanup control if necessary
    }
}
