import * as React from "react";
import { Stack, IStackTokens } from "@fluentui/react";
import { SearchBox } from '@fluentui/react/lib/SearchBox';
import { DetailsList, DetailsListLayoutMode, SelectionMode, Selection } from '@fluentui/react/lib/DetailsList';
import { PrimaryButton } from '@fluentui/react/lib/Button';

export interface IPickerProps{
    options: IListItem[]
    callback: (schemaName: string) => void
}

export interface IListItem{
    key: number,
    setName: string,
    schemaName:string
}

const columns = [
    { key: 'column1', name: 'Set Name', fieldName: 'setName', minWidth: 100, maxWidth: 200, isResizable: true },
    { key: 'column2', name: 'Schema Name', fieldName: 'schemaName', minWidth: 100, maxWidth: 200, isResizable: true },
]

export function picker(props: IPickerProps){
    const [options, setOptions] = React.useState(props.options);
    const [currentSelection, setCurrentSelection] = React.useState('');
    const stackTokens : IStackTokens = {
        maxWidth:"400"
    }
    let selection: Selection = new Selection({
        onSelectionChanged: () => {
          setCurrentSelection((selection.getSelection()[0] as IListItem).schemaName)
        },
      });

    return (
        <Stack tokens={stackTokens}>
            <SearchBox 
                placeholder="search tables in this database" 
                onChange={(_, newValue) => {
                    if(newValue){
                        setOptions(props.options.filter(x => x.schemaName.match(newValue) || x.setName.match(newValue)))
                    }
                    else{
                        setOptions(props.options)
                    }}
                } 
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
                />
            <PrimaryButton text="Select Table" onClick={() => props.callback(currentSelection)} allowDisabledFocus />
        </Stack>
    )
}