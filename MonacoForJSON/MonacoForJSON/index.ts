import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { Editor, IEditorProps } from "./editor";
import * as React from "react";

export class monacoForJSON implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void;
    private currentValue: string;
    private isLoaded: boolean = false;
    private defaultString: string = "";

    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        //we only want to push the colstring to the editor on first load, otherwise it loops and causes editor to continually lose focus
        if(!this.isLoaded){
            this.defaultString = context.parameters.stringJSON.raw ? context.parameters.stringJSON.raw : "{\n\t //Add custom objects to this JSON to create context parameters \n}"
            this.isLoaded=true;
        }
        let props: IEditorProps = { 
            callback: this.callback.bind(this),
            defaultValue: this.defaultString
        };
        return React.createElement(
            Editor, props
        );
    }

    public callback(newString: string): void {
        this.currentValue = newString;
        this.notifyOutputChanged();
    }

    public getOutputs(): IOutputs {
        return { stringJSON: this.currentValue };
    }

    public destroy(): void {
        // Add code to cleanup control if necessary
    }
}
