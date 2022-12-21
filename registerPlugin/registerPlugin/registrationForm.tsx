import {
  ChoiceGroup,
  IBasePickerSuggestionsProps,
  IChoiceGroupOption,
  IStackTokens,
  ITag,
  ITextFieldStyles,
  PrimaryButton,
  Stack,
  StackItem,
  TagPicker,
  Text,
  TextField,
} from "@fluentui/react";
import * as React from "react";
import * as Register from "./registrationModel";

export interface IRegProps {
  assemblyName: string | null;
  stepName: string | null;
  callback: (parameters: Register.register) => void;
}

const stackTokens: IStackTokens = {
  //stack tokens: pagging, child gap, alignment, etc.
  childrenGap: 10,
};
const textFieldStyles: Partial<ITextFieldStyles> = {
  fieldGroup: { width: 225 },
  root: { textAlign: "left" },
};
const pickerSuggestionsProps: IBasePickerSuggestionsProps = {
  suggestionsHeaderText: "Suggested attributes",
  noResultsFoundText: "No matching attributes!",
};
const stageChoices: IChoiceGroupOption[] = [
  { key: "Pre-validation", text: "Pre-validation" },
  { key: "Pre-operation", text: "Pre-operation" },
  { key: "Post-operation", text: "Post-operation" },
];
const modeChoices: IChoiceGroupOption[] = [
  { key: "Synchronous", text: "Synchronous" },
  { key: "Asynchronous", text: "Asynchronous" },
];
const sdkMessageChoices: IChoiceGroupOption[] = [
  { key: "Create", text: "Create" },
  { key: "Delete", text: "Delete" },
  { key: "Update", text: "Update" },
];

let _selectedMessage: string = "";
let _selectedStage: string = "";
let _selectedMode: string = "";
let _selectedAttribs: string[] = [];
let _primaryTable: string | undefined = "";
let _attributes: string[] = [];
let _stepName: string | undefined = "";
let _secureConfig: string | undefined = "";
let _unsecureConfig: string | undefined = "";


export const RegisterForm: React.FC<IRegProps> = (props: IRegProps) => {
  const [selectedMessage, setSelectedMessage] = React.useState(_selectedMessage);
  const [selectedStage, setSelectedStage] = React.useState(_selectedStage);
  const [selectedMode, setSelectedMode] = React.useState(_selectedMode);
  const [selectedAttribs, setSelectedAttribs] = React.useState(_selectedAttribs);
  const [primaryTable, setPrimaryTable] = React.useState(_primaryTable);
  const [stepName, setStepName] = React.useState(_stepName);
  const [attributes, setAttributes] = React.useState(_attributes);
  const [secureConfig, setSecureConfig] = React.useState(_secureConfig);
  const [unsecureConfig, setUnsecureConfig] = React.useState(_unsecureConfig);

  if (!props.assemblyName) {
    return (
      <Text variant="xLarge">
        No Plugin Assembly has been designated for this registration area.
        Please designate an Assembly.
      </Text>
    );
  }

  const onChangePrimaryTable = React.useCallback(
    (
      event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
      newValue?: string
    ) => {
      setPrimaryTable(newValue);
    },
    []
  );
  const onChangeStepName = React.useCallback(
    (
      event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
      newValue?: string
    ) => {
      setStepName(newValue);
    },
    []
  );
  const onResolveFilterAttributes = (
    filterText: string,
    selectedItems: ITag[] | undefined
  ): ITag[] => {
    return [];
    // return filterText
    //   ? testTags.filter(
    //       tag => tag.name.toLowerCase().indexOf(filterText.toLowerCase()) === 0 && !listContainsTagList(tag, tagList),
    //     )
    //   : [];
  };
  const onClickRegister = () => {};
  const onChangeSecureConfig = React.useCallback(
    (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
      setSecureConfig(newValue);
    },
    [],
  );
  const onChangeUnsecureConfig = React.useCallback(
    (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
      setUnsecureConfig(newValue);
    },
    [],
  );
  return (
    <Stack tokens={{childrenGap: 15}}>
        {/* header */}
        <StackItem align="baseline" styles={{root: {width:525, textAlign: 'center'}}}>
            <Text variant="xLarge">Register Plugin Execution</Text>
        </StackItem>
        <Stack horizontal tokens={{childrenGap: 30}}>
        <Stack tokens={stackTokens}>
        {/* table */}
        <StackItem align="start">
            <TextField
            label="Primary Table"
            value={primaryTable}
            onChange={onChangePrimaryTable}
            styles={textFieldStyles}
            required={true}
            />
        </StackItem>
        {/* sdkMessage */}
        <StackItem align="baseline">
            <ChoiceGroup
            options={sdkMessageChoices}
            disabled={!props.stepName}
            defaultChecked={true}
            defaultSelectedKey={selectedMessage}
            onChange={(_, option) => {
                setSelectedMessage(option!.text);
            }}
            label="Select the SDK Message"
            required={true}
            />
        </StackItem>
        {/* Filter Attribs */}
        <StackItem align="start" styles={{ root: { textAlign: "left" } }}>
            {/* picker isn't ideal. Should maybe have checkboxes instead? */}
            <Stack tokens={{childrenGap:5}}>
                <Text
                variant="medium"
                styles={{ root: { "font-weight": 600, textAlign: "left" } }}
                >
                Select Filtering Atributes
                </Text>
                <TagPicker
                removeButtonAriaLabel="Remove attribute"
                selectionAriaLabel="Select filtering attributes"
                onResolveSuggestions={onResolveFilterAttributes}
                getTextFromItem={(item: ITag) => item.name}
                pickerSuggestionsProps={pickerSuggestionsProps}
                disabled={!props.stepName}
                styles={{ root: { width: 225 } }}
                />
            </Stack>
        </StackItem>
        {/* Stage */}
        <StackItem align="baseline">
            <ChoiceGroup
            options={stageChoices}
            disabled={!props.stepName}
            defaultChecked={true}
            defaultSelectedKey={selectedStage}
            onChange={(_, option) => {
                setSelectedStage(option!.text);
            }}
            label="Select the plugin execution stage"
            required={true}
            />
        </StackItem>
        </Stack>
        <Stack tokens={stackTokens}>
        {/* stepname */}
        <StackItem align="start">
            <TextField
            label="Step Name"
            value={stepName}
            onChange={onChangeStepName}
            styles={textFieldStyles}
            required={true}
            />
        </StackItem>
        {/* mode */}
        <StackItem align="baseline">
            <ChoiceGroup
            options={modeChoices}
            disabled={!props.stepName}
            defaultChecked={true}
            defaultSelectedKey={selectedMode}
            onChange={(_, option) => {
                setSelectedMode(option!.text);
            }}
            label="Select the plugin execution mode"
            required={true}
            />
        </StackItem>
        {/* unsecure */}
        <StackItem align="baseline">
            <TextField label="Unsecure Config" multiline autoAdjustHeight styles={{root: {textAlign:'left', width: 225} }} onChange={onChangeUnsecureConfig} />
        </StackItem>
        {/* secure */}
        <StackItem align="baseline">
            <TextField label="Secure Config" multiline autoAdjustHeight styles={{root: {textAlign:'left', width: 225} }} onChange={onChangeSecureConfig} />
        </StackItem>
        {/* go button */}
        </Stack>
        </Stack>
        <StackItem align="baseline" styles={{root: {width: 525}}}>
            <PrimaryButton
            text="Register Plugin"
            onClick={() => {
                onClickRegister;
            }}
            allowDisabledFocus
            disabled={false}
            />
        </StackItem>
    </Stack>
  );
};