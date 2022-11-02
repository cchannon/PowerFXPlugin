import { IStackTokens, Stack } from "@fluentui/react";
import * as React from "react";
import { ContextObj } from "./models";

export enum pluginStage{
    "Pre-validation",
    "Pre-operation",
    "Post-operation"
}

export enum pluginMode{
    "Asynchronous",
    "Synchronous"
}

export interface IRegistrationProps {
    jsonObj: ContextObj | null,
    callback: (filteringAttributes: string[], stage: pluginStage, mode: pluginMode) => void
}

const stackTokens: IStackTokens = {

}

export const RegisterForm: React.FC<IRegistrationProps> = () => {

    return(
        <Stack tokens={stackTokens}>
            {/* already registered? */}
            {/* filtering attribs */}
            {/* stage */}
            {/* mode */}
            {/* go button */}
        </Stack>
    )
}