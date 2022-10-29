import {IInputs, IOutputs} from "./generated/ManifestTypes";
import { IEditorProps, pfxEditor } from "./editor";
import * as React from "react";
import * as ReactDOM from "react-dom";

export class pfxpcf implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private _propUpdate: string;
    private _notify: () => void;

    constructor()
    {
    }
    
    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container:HTMLDivElement): void
    {
        this._notify = notifyOutputChanged;
        let props: IEditorProps = {
            currentValue: context.parameters.sampleProperty.raw??"",
            updateCallback: this.callback.bind(this)
        }
        ReactDOM.render(React.createElement(pfxEditor, props), container);
    }

    public callback(data: string){
        this._propUpdate = data;
        this._notify();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void
    {
        // Add code to update control view
    }
    public getOutputs(): IOutputs
    {
        return {sampleProperty: this._propUpdate};
    }
    public destroy(): void
    {
    }
}
