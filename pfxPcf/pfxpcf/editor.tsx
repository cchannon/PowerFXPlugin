import * as React from 'react';
import { IDisposable, MessageProcessor, PowerFxFormulaEditor } from '@microsoft/power-fx-formulabar';

export interface IEditorProps {
    currentValue: string,
    updateCallback: (data: string) => void;
}

export function pfxEditor (props: IEditorProps){
    const [isError, setIsError] = React.useState(false);
    
    let messageProcessor: MessageProcessor = {
        addListener: (listener: (data: string) => void): IDisposable => {
            listener = props.updateCallback;
            return {
                dispose: () => null
            };
        },
        sendAsync: async (data: string): Promise<void> =>{
            if(JSON.parse(data).params?.contentChanges[0]?.text) { 
                props.updateCallback(JSON.parse(data).params?.contentChanges[0]?.text) 
            }
            console.log(data);
        }
    };
    return(
        <PowerFxFormulaEditor 
            defaultValue={props.currentValue} 
            minLineCount={10} 
            maxLineCount={1000} 
            getDocumentUriAsync={_getDocumentUriAsync} 
            messageProcessor={messageProcessor}/>
    )
}

async function _getDocumentUriAsync(): Promise<string> {
    return "https://www.bing.com";
  };