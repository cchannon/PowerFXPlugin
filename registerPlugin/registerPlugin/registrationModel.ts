export class step{
    public Id: string | null;
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

export type sdkMessage = "Create" | "Update" | "Delete";
export type stage = "Pre-validation" | "Pre-operation" | "Post-operation";
export type mode = "Synchronous" | "Asynchronous";