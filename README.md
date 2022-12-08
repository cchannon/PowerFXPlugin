# PowerFX Plugins

This repo seeks to demonstrate a viable use of PowerFX as a low-code tool for authoring custom logic to execute in Dataverse Plugin Context. There are many business cases that requre plugin execution as opposed to low-code alternatives--such as the need to inject logic into unattended events--and this repo demonstrates an approach to using PowerFX to support those cases.

## Contents

This repo introduces 4 main elements for addressing this challenge:
- PCF control for pre-populating the Context JSON based on user selection of target table ( ./contextBuilder/ )
- Monaco Editor PCF for PowerFX Logic Authoring ( ./MonacoForPFX/ )
- Plugin Package for the Evaluation assembly ( ./pfxPlugin/ )
- PCF control for registering new steps on the plugin assembly ( ./registerPlugin/ )

## POC Design

The initial Proof of Concept will consist of a plugin package and <some> PCFs registered on a model driven app custom table. The table will store the PowerFX definitions for each custom rule to be implemented (event, context, code) and each row will (once published) correspond 1:1 with a registered plugin step.

The pre-populating PCF will enable a user to pick a target table and auto-generate Context JSON. The Context JSON will represent the table definition, with objects containing values for each column on the table, and will exist only as reference for the authoring user (future iterations will build upon usability of this reference).

The Monaco PFX control will then allow the user to add PFX logic, and the Plugin Package will evaluate that logic and take action. Initially, the only actions supported by the Plugin Package will be:

- To add to a plugin trace any direct output value from the PFX
- To check the Context for any altered values (i.e. any context parameters that were edited with a Set() ) and issue commensurate changes to the table

The PFX Plugin will NOT initially support referencing other Dataverse tables/records (although this is a desired end state).

The register plugin PCF will allow the user to "publish" the pfx definition to a step.

## contextBuilder
The context builder allows the user to browse all tables in the current dataverse database (by setname or by schemaname) and select a table to register PowerFX on. The control is built on a Virtual PCF (fw=react) using only standard FluentUI elements.

![context builder](./img/contextBuilder.png "contextBuilder PCF Control")

## Monaco for JSON

This control is being dropped. The Context Object was determined easier to evaluate at runtime (given that actual input vars needed to be evaluated at that time anyway) so the predefinition and mutability of that definition are no longer needed. 

In the future, we might want to re-introduce a JSON control window for allowing UDFs and UDVs, but for now this is removed from scope.

## Monaco for PFX

This Monaco editor gives the user basic syntax coloring, but none of the server-side validation or autocompletion of the PowerFX code editor examples. Those features are excellent, but in a PowerApps context the requirement for running an ASP.net site dramatically complicates deployment *(yes,* __🙏@MikeStall🙏__ *I could have built this control based on the [PowerFX Samples](https://github.com/microsoft/power-fx-host-samples) but I would have lost a lot of folks who are PowerApps Only and don't speak Azure or custom web - even as it is all these PCFs are probably too much for folks that don't have pro dev support)* 🤯 The server-side piece of the sample code is pretty straightforward - maybe in a future project I'll try to implement that as a Custom API to keep it "dataverse friendly."

![Power FX Monaco Code Editor](img/pfx.png "PowerFX Monaco Code Editor")

## pfxPlugin

Disclaimers: 
- The plugin execution currently only supports the context of the currently executing record. We're hoping in the future to support other records in the same table, then other dataverse tables, then (maybe someday!) other datasources, but for this immediate release, the context is very limited.
- Mutation effects on Records (i.e. updating EntityReference columns) are not working right now. There is an issue in PFX that we're trying to sort through
- The pfx Plugin was written on the latest PAC Plugin template, and uses the base class from that plugin template.
- This Plugin was written as a Plugin Package, since it requires external Nuget packages from the PFX team.
- The Pluign Package can ONLY be deployed as a package, and not as a freestanding Plugin Assembly, so if you aren't comfortable with managing assembly dependencies, I suggest you wait until the--let's call it "alpha" release--solution file is available 😁
- The Plugin dependencies referenced from core look at the PowerFX latest nuget stream. This means you will need to create your own Nuget reference from Visual Studio. The PowerFX Github README contains some instructions links for this if you're not sure how.

****More notes to follow
