export class register{
    public AssemblyName: string;
    public StepName: string;
    public SdkMessage: sdkMessage;
    public Stage: stage
    public Mode: mode;
    public primaryTable: string;
    public secondaryTable: string;
    public executionOrder: number;
    public description: string;
    public unsecureConfig: string;
    public secureConfig: string;
    public filterAttributes: string[];
}

export enum sdkMessage{
    create=0,
    update=1,
    delete=2
}

export enum stage{
    preValidation=0,
    preOperation=1,
    postOperation=2
}

export enum mode{
    synchronous=0,
    asynchronous=1
}