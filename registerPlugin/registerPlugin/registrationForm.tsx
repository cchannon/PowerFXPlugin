import {
  ChoiceGroup,
  ComboBox,
  Dialog,
  IBasePickerSuggestionsProps,
  IChoiceGroupOption,
  IComboBox,
  IComboBoxOption,
  IModalProps,
  IStackTokens,
  ITag,
  ITextFieldStyles,
  Position,
  PrimaryButton,
  SpinButton,
  Stack,
  StackItem,
  TagPicker,
  Text,
  TextField,
  ContextualMenu
} from "@fluentui/react";
import * as React from "react";
import * as Register from "./registrationModel";

export interface IRegProps {
  assemblyName: string | null;
  stepId: string | null;
  webApi: ComponentFramework.WebApi;
  callback: (parameters: Register.step) => void;
}

//#region executing parameters
const stackTokens: IStackTokens = {
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
//#endregion

//#region State Defaults
let _selectedMessage: Register.sdkMessage = "Create";
let _selectedStage: Register.stage = "Pre-validation";
let _selectedMode: Register.mode = "Asynchronous";
let _selectedAttribs: string[] = [];
let _primaryTable: string | undefined = "";
let _attributes: string[] = [];
let _stepName: string | undefined = "";
let _secureConfig: string | undefined = "";
let _unsecureConfig: string | undefined = "";
let _executionOrder: number = 1;
let _allTables: IComboBoxOption[] = [];
let _modalProps: IModalProps= {
    titleAriaId: "No records found",
    subtitleAriaId: "No records found",
    isBlocking: false,
    dragOptions: {
        moveMenuItemText: 'Move',
        closeMenuItemText: 'Close',
        menu: ContextualMenu,
        keepInBounds: true,
      }
  }
//#endregion

export const RegisterForm: React.FC<IRegProps> = (props: IRegProps) => {
  //#region State declarations
  const [selectedMessage, setSelectedMessage] =
    React.useState(_selectedMessage);
  const [selectedStage, setSelectedStage] = React.useState(_selectedStage);
  const [selectedMode, setSelectedMode] = React.useState(_selectedMode);
  const [allAttributes, setAllAttributes] = React.useState(_attributes);
  const [selectedAttribs, setSelectedAttribs] =
    React.useState(_selectedAttribs);
  const [primaryTable, setPrimaryTable] = React.useState(_primaryTable);
  const [stepName, setStepName] = React.useState(_stepName);
  const [secureConfig, setSecureConfig] = React.useState(_secureConfig);
  const [unsecureConfig, setUnsecureConfig] = React.useState(_unsecureConfig);
  const [executionOrder, setExecutionOrder] = React.useState(_executionOrder);
  const [formReady, setFormReady] = React.useState(false);
  const [allTables, setAllTables] = React.useState(_allTables);
  const [hasRows, setHasRows] = React.useState(true);
  //#endregion

  //handle null assemblyname
  if (!props.assemblyName) {
    return (
      <Text variant="xLarge">
        No Plugin Assembly has been designated for this registration area.
        Please designate an Assembly before attempting to register.
      </Text>
    );
  }

  //Get Tables
  if (allTables.length === 0) {
    props.webApi
      .retrieveMultipleRecords(
        "entity",
        "?$select=collectionname,logicalname&$filter=collectionname ne null"
      )
      .then((success) => {
        let tables: IComboBoxOption[] = [];
        success.entities.forEach((x) => {
          tables.push({
            key: x.logicalname,
            text: x.collectionname,
          } as IComboBoxOption);
        });
        setAllTables(tables);
      });
  }

  //Get Table Attributes
  const getTableAttributes = React.useCallback((tablename: string | undefined) => {
    if(!tablename){
        setFormReady(false);
    }
    else{
        props.webApi.retrieveMultipleRecords(tablename, undefined, 1).then((e) => {
            if(e.entities.length === 0){
                setHasRows(false);
            }
            else{
                let ent = e.entities[0];
            }
        },
        (err) => {
            console.log(err);
        });
    }
  }, []);

  //#region Change Handlers
  const onChangePrimaryTable = React.useCallback(
    (
      event: React.FormEvent<IComboBox>,
      option?: IComboBoxOption | undefined,
      index?: number | undefined,
      value?: string | undefined
    ) => {
      setPrimaryTable(option?.key.toString());
      getTableAttributes(option?.key.toString());
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
  const onClickRegister = () => {
    let registration: Register.step = {
      Id: props.stepId,
      AssemblyName: props.assemblyName!,
      StepName: stepName!,
      SdkMessage: selectedMessage,
      Stage: selectedStage,
      Mode: selectedMode,
      primaryTable: primaryTable!,
      secondaryTable: "",
      executionOrder: executionOrder,
      description: "",
      unsecureConfig: unsecureConfig ?? "",
      secureConfig: secureConfig ?? "",
      filterAttributes: selectedAttribs,
    };
  };
  const onChangeSecureConfig = React.useCallback(
    (
      event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
      newValue?: string
    ) => {
      setSecureConfig(newValue);
    },
    []
  );
  const onChangeUnsecureConfig = React.useCallback(
    (
      event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
      newValue?: string
    ) => {
      setUnsecureConfig(newValue);
    },
    []
  );
  const onChangeSelectedMessage = React.useCallback((message: string) => {
    setSelectedMessage(message as Register.sdkMessage);
  }, []);
  const onChangeSelectedMode = React.useCallback((message: string) => {
    setSelectedMode(message as Register.mode);
  }, []);
  const onChangeSelectedStage = React.useCallback((message: string) => {
    setSelectedStage(message as Register.stage);
  }, []);
  const onChangeExecutionOrder = React.useCallback(
    (
      event: React.SyntheticEvent<HTMLElement, Event>,
      newValue?: string | undefined
    ) => {
      setExecutionOrder(parseInt(newValue!));
    },
    []
  );
  const onAttributesChanged = React.useCallback(
    (items?: ITag[] | undefined) => {
      setSelectedAttribs(
        items?.map((x) => {
          return x.name;
        })!
      );
    },
    []
  );
  const onDismissDialog = React.useCallback(
    ( ) => {

    },[]
  )
  //#endregion

  return (
    <>
    <Dialog hidden={hasRows} onDismiss={onDismissDialog} modalProps={_modalProps} />
    <Stack tokens={{ childrenGap: 15 }}>
      {/* header */}
      <StackItem
        align="baseline"
        styles={{ root: { width: 525, textAlign: "center" } }}
      >
        <Text variant="xLarge">Register Plugin Execution</Text>
      </StackItem>
      <Stack horizontal tokens={{ childrenGap: 30 }}>
        <Stack tokens={stackTokens}>
          {/* table */}
          <StackItem align="start" styles={{ root: { textAlign: "left" } }}>
            <ComboBox
              label="Primary Table"
              options={allTables}
              styles={{ root: { width: 225 } }}
              allowFreeform
              autoComplete="on"
              onChange={onChangePrimaryTable}
            />
          </StackItem>
          {/* sdkMessage */}
          <StackItem align="baseline">
            <ChoiceGroup
              options={sdkMessageChoices}
              defaultChecked={true}
              defaultSelectedKey={selectedMessage.toString()}
              onChange={(_, option) => {
                onChangeSelectedMessage(option!.text);
              }}
              label="Select the SDK Message"
              required={true}
            />
          </StackItem>
          {/* Filter Attribs */}
          <StackItem align="start" styles={{ root: { textAlign: "left" } }}>
            <Stack tokens={{ childrenGap: 5 }}>
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
                disabled={!formReady}
                styles={{ root: { width: 225 } }}
                onChange={onAttributesChanged}
              />
            </Stack>
          </StackItem>
          {/* Stage */}
          <StackItem align="baseline">
            <ChoiceGroup
              options={stageChoices}
              disabled={!formReady}
              defaultChecked={true}
              defaultSelectedKey={selectedStage}
              onChange={(_, option) => {
                onChangeSelectedStage(option!.text);
              }}
              label="Select the plugin execution stage"
              required={true}
            />
          </StackItem>
          {/* mode */}
          <StackItem align="baseline">
            <ChoiceGroup
              options={modeChoices}
              disabled={!formReady}
              defaultChecked={true}
              defaultSelectedKey={selectedMode}
              onChange={(_, option) => {
                onChangeSelectedMode(option!.text);
              }}
              label="Select the plugin execution mode"
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
              disabled={!formReady}
              onChange={onChangeStepName}
              styles={textFieldStyles}
              required={true}
            />
          </StackItem>
          {/* order */}
          <StackItem align="start">
            <SpinButton
              label="Execution Order"
              labelPosition={Position.top}
              defaultValue={executionOrder.toString()}
              min={1}
              max={99}
              step={1}
              disabled={!formReady}
              incrementButtonAriaLabel="Increase value by 1"
              decrementButtonAriaLabel="Decrease value by 1"
              styles={{
                spinButtonWrapper: { width: 225 },
                root: { textAlign: "left" },
              }}
              onChange={onChangeExecutionOrder}
            />
          </StackItem>
          {/* unsecure */}
          <StackItem align="baseline">
            <TextField
              label="Unsecure Config"
              multiline
              autoAdjustHeight
              rows={7}
              disabled={!formReady}
              styles={{ root: { textAlign: "left", width: 225 } }}
              onChange={onChangeUnsecureConfig}
            />
          </StackItem>
          {/* secure */}
          <StackItem align="baseline">
            <TextField
              label="Secure Config"
              multiline
              autoAdjustHeight
              rows={7}
              styles={{ root: { textAlign: "left", width: 225 } }}
              onChange={onChangeSecureConfig}
              disabled={!formReady}
            />
          </StackItem>
          {/* go button */}
        </Stack>
      </Stack>
      <StackItem align="baseline" styles={{ root: { width: 525 } }}>
        <PrimaryButton
          text="Register Plugin"
          onClick={() => {
            onClickRegister;
          }}
          allowDisabledFocus
          disabled={!formReady}
        />
      </StackItem>
    </Stack>
    </>
  );
};
