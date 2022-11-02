import * as React from "react";
import { Stack, IStackTokens, StackItem, IStackItemStyles, IStackStyles, IStackItemTokens, Callout } from "@fluentui/react";
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { DetailsList, DetailsListLayoutMode, SelectionMode, Selection, IDetailsListStyles, ConstrainMode } from '@fluentui/react/lib/DetailsList';
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { IInputs } from "./generated/ManifestTypes";
import { NOTFOUND } from "dns";

export interface IPickerProps{
    callback: (schemaName: string) => void,
    context: ComponentFramework.Context<IInputs>,
}

export interface IListItem{
    key: number,
    setName: string,
    schemaName:string
}

let allOptions: IListItem[] = [];
const columns = [
    { key: 'column1', name: 'Set Name', fieldName: 'setName', minWidth: 100, maxWidth: 200, isResizable: true },
    { key: 'column2', name: 'Schema Name', fieldName: 'schemaName', minWidth: 100, maxWidth: 200, isResizable: true },
]

const gridStyles: Partial<IDetailsListStyles> = {
    root: {
        overflowX: 'scroll',
        selectors: {
            '& [role=grid]': {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'start',
            height: '60vh',
            width:'25vw'
            },
        },
    },
    headerWrapper: {
        flex: '0 0 auto',
    },
    contentWrapper: {
        flex: '1 1 auto',
        overflowY: 'auto',
        overflowX: 'hidden',
    },
};

let calloutVisible = false;

export const picker: React.FC<IPickerProps> = ((props: IPickerProps) => {
    const [options, setOptions] = React.useState(allOptions);

    if(allOptions.length == 0){
        props.context.webAPI.retrieveMultipleRecords("entity", "?$select=originallocalizedcollectionname,logicalname&$filter=originallocalizedcollectionname ne null").then(
            (success) => {
                let index = 1;
                success.entities.forEach(x => {
                    allOptions.push({key: index, setName: x.originallocalizedcollectionname, schemaName: x.logicalname} as IListItem);
                    index++;
                });
                setOptions(allOptions);
            }
        );
    }

    const [currentSelection, setCurrentSelection] = React.useState('');
    const [hasSelection, setHasSelection] = React.useState(false);
    const [notFound, setNotFound] = React.useState(false);
    
    const stackTokens : IStackTokens = {
        maxWidth:"25vw",
        childrenGap: 's'
    }

    const hStackTokens: IStackTokens = {
        childrenGap: 'm',
        padding: 'm',
    };

    let selection: Selection = new Selection({
        onSelectionChanged: () => {
            if(selection.count > 0){
                setCurrentSelection((selection.getSelection()[0] as IListItem).schemaName)
                setHasSelection(true);
            }
            else setHasSelection(false);
        }
    });
    
    return (
        <Stack tokens={stackTokens}>
            <SearchBox 
                placeholder="search tables in this database" 
                onChange={(_, newValue) => {
                    if(newValue){
                        setOptions(allOptions!.filter(x => x.schemaName.match(newValue) || x.setName.match(newValue)))
                    }
                    else{
                        setOptions(allOptions)
                    }
                }} 
            />
            <DetailsList
                items={options} 
                columns={columns} 
                layoutMode={DetailsListLayoutMode.justified} 
                selectionPreservedOnEmptyClick={true} 
                ariaLabelForSelectionColumn="Toggle selection"
                checkButtonAriaLabel="select row"
                selectionMode={SelectionMode.single}
                selection={selection}
                styles={gridStyles}
                constrainMode={ConstrainMode.unconstrained}
            />
            <Stack horizontal tokens={hStackTokens}>
                <StackItem>
                    <PrimaryButton 
                        id={"setTable"} 
                        text="Select Table" 
                        onClick={() => props.callback(currentSelection)} 
                        allowDisabledFocus 
                        disabled={!hasSelection}
                    />
                </StackItem>
                <StackItem>
                    <DefaultButton text="Cancel" />
                </StackItem>
            </Stack>
        </Stack>
    )
});