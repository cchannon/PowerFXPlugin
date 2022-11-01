import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { Editor, IEditorProps } from "./editor";
import * as React from "react";

export class monacoForPFX implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void;
    private currentValue: string;

    constructor() { }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        const defaultString = context.parameters.stringPFX.raw ? context.parameters.stringPFX.raw : "{\n\t //Add custom objects to this JSON to create context parameters \n}"
        const props: IEditorProps = { 
            callback: this.callback.bind(this),
            defaultValue: defaultString
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
        return { stringPFX: this.currentValue };
    }

    public destroy(): void {
        // Add code to cleanup control if necessary
    }
}
