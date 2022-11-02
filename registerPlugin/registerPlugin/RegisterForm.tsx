import { ChoiceGroup, IBasePickerSuggestionsProps, IChoiceGroupOption, IStackTokens, ITag, PrimaryButton, Stack, StackItem, TagPicker } from "@fluentui/react";
import * as React from "react";
import { ContextObj } from "./models";

export interface IRegistrationProps {
    jsonObj: ContextObj | null,
    registered: boolean,
    callback: (filteringAttributes: string[], stage: string, mode: string) => void
}

const stackTokens: IStackTokens = {

}
const pickerSuggestionsProps: IBasePickerSuggestionsProps = {
    suggestionsHeaderText: 'Suggested attributes',
    noResultsFoundText: 'No matching attributes!',
};
const stageChoices: IChoiceGroupOption[] = [
    {key: "Pre-validation", text: "Pre-validation"},
    {key: "Pre-operation", text: "Pre-operation"},
    {key: "Post-operation", text: "Post-operation"}
]
const modeChoices: IChoiceGroupOption[] = [
    {key: "Synchronous", text: "Synchronous"},
    {key: "Asynchronous", text: "Asynchronous"}
]

let selectedStage: string;
let selectedMode: string;
let selectedAttribs: string[];
  
export const RegisterForm: React.FC<IRegistrationProps> = (props: IRegistrationProps) => {
    const[registered, setRegistered] = React.useState(true);
    const allTags: ITag[] = Object.entries(props.jsonObj!.attributes).map(item => ({ key: item[0], name: item[0] }));
    const listContainsTagList = (tag: ITag, tagList?: ITag[]) => {
        if (!tagList || !tagList.length || tagList.length === 0) {
            return false;
        }
        return tagList.some(compareTag => compareTag.key === tag.key);
    };
    const filterSuggestedTags = (filter: string, selectedItems: ITag[] | undefined): ITag[] => {
        return filter ? allTags.filter(tag => tag.name.toLowerCase().match(filter.toLowerCase()) && !listContainsTagList(tag, selectedItems),) : [];
    };

    return(
        <Stack tokens={stackTokens}>
            {/* header */}

            {/* filtering attribs */}
            <TagPicker
                removeButtonAriaLabel="Remove attribute"
                selectionAriaLabel="Selected filtering attributes"
                onResolveSuggestions={filterSuggestedTags}
                getTextFromItem={(item: ITag) => item.name}
                pickerSuggestionsProps={pickerSuggestionsProps}
                disabled={registered}
            />
            {/* stage */}
            <ChoiceGroup 
                options={stageChoices} 
                disabled={registered}
                onChange={(_, option) => { selectedStage = option!.text}} 
                label="Select the plugin execution stage" 
                required={true} 
            />
            {/* mode */}
            <ChoiceGroup 
                options={modeChoices} 
                disabled={registered}
                onChange={(_, option) => { selectedMode = option!.text}} 
                label="Select the plugin execution mode" 
                required={true} 
            />
            {/* go button */}
            <StackItem>
                <PrimaryButton
                    text="Register Plugin"
                    onClick={() => registerPlugin()}
                    allowDisabledFocus
                    disabled={selectedAttribs.length===0 || registered}
                />
            </StackItem>
        </Stack>
    )
}

function registerPlugin(): void {
    // Check to see if already registered
    // True: set Registered: True, callback Registered
}
