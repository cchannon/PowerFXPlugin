# PowerFX Plugins

This repo seeks to demonstrate a viable use of PowerFX as a low-code tool for authoring custom logic to execute in Dataverse Plugin Context. There are many business cases that requre plugin execution as opposed to low-code alternatives--such as the need to inject logic into unattended events--and this repo demonstrates an approach to using PowerFX to support those cases.

## Contents

This repo introduces 5 main elements for addressing this challenge:
- PowerFX Editor PCF for PowerFX Logic Authoring ( ./MonacoForPFX/ )
- A Monaco Editor PCF for JSON for Context Definition ( ./MonacoForJSON/ )
- A Plugin Package for the Evaluation assembly ( ./pfxPlugin/ )
- A PCF control for pre-populating the Context JSON based on user selection of target table ( ./contextBuilder/ )
- A PCF control for registering new steps on the plugin assembly ( TBD )

## POC Design

The initial Proof of Concept will consist of a plugin package and four PCFs registered on a single form on a custom table. The table will store the PowerFX definitions for each custom rule to be implemented (event, context, code) and each row will (once published) correspond 1:1 with a registered plugin step.

when form type is Create the pre-populating PCF will enable a user to pick a target table and one "sample" row from that table to prepopulate the Context JSON. The Context JSON will then pull the table definition and build objects containing values for each column on the table.

Once populated, the Context JSON will be editable in the Monaco Editor PCF so that additional const params and sample values can be added, if appropriate.

The pfxPcf control will then allow the user to add PCF logic, and the Plugin Package will evaluate that logic and take action. Initially, the only actions supported by the Plugin Package will be:

- To add to a plugin trace any direct output value from the PFX
- To check the Context for any altered values (i.e. any context values that were edited with a Set() ) and issue commensurate changes to the table

The register plugin PCF will allow the user to "publish" the pfx definition to a step.
