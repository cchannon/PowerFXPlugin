import {
  ChoiceGroup,
  ComboBox,
  Dialog,
  IBasePickerSuggestionsProps,
  IChoiceGroupOption,
  IComboBox,
  IComboBoxOption,
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
  DialogType,
  DialogFooter,
} from "@fluentui/react";
import * as React from "react";
import { IInputs } from "./generated/ManifestTypes";
import * as Register from "./registrationModel";

export interface IRegProps {
  pluginName: string | null;
  stepId: string | null;
  context: ComponentFramework.Context<IInputs>;
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
const _dialogContentProps = {
  type: DialogType.normal,
  title: "No Rows Found",
  closeButtonAriaLabel: "Close",
  subText:
    "No Rows were found on this selected table. At least one row must exist before you can register the plugin step.",
};
//#endregion

//#region State Defaults
let _selectedMessage: Register.sdkMessage = "Create";
let _selectedStage: Register.stage = "Pre-validation";
let _selectedMode: Register.mode = "Synchronous";
let _selectedAttribs: string[] = [];
let _primaryTable: string | undefined = "";
let _attributes: string[] = [];
let _stepName: string | undefined = "";
let _secureConfig: string | undefined = "";
let _unsecureConfig: string | undefined = "";
let _executionOrder: number = 1;
let _allTables: IComboBoxOption[] = [];
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
  const [allTables, setAllTables] = React.useState(_allTables);
  const [formReady, setFormReady] = React.useState(false);
  const [hasRows, setHasRows] = React.useState(true);
  const [defaulted, setDefaulted] = React.useState(false);

  //#endregion

  //handle null assemblyname
  if (!props.pluginName) {
    return (
      <Text variant="xLarge">
        No Plugin has been designated for this registration area. Please
        designate an Assembly and Plugin before attempting to register.
      </Text>
    );
  }

  //Get Existing Step Config and default values
  if (props.stepId && !defaulted) {
    props.context.webAPI
      .retrieveRecord(
        "sdkmessageprocessingstep",
        props.stepId,
        "?$select=mode,rank,filteringattributes,stage,name,configuration&$expand=sdkmessageid($select=name),sdkmessagefilterid($select=primaryobjecttypecode)"
      )
      .then(
        (success) => {
          if (success.sdkmessagefilterid.primaryobjecttypecode) {
            //this one needs its own handler so we can unlock the rest of the form (text prop doesn't actually fire change event on combobox)
            onDefaultPrimaryTable(
              success.sdkmessagefilterid.primaryobjecttypecode
            );
          }
          if (success.sdkmessageid.name) {
            setSelectedMessage(success.sdkmessageid.name);
          }
          setSelectedMode(success.mode === 1 ? "Asynchronous" : "Synchronous");
          if (success.stage) {
            setSelectedStage(
              success.stage === 10
                ? "Pre-validation"
                : success.stage === 20
                ? "Pre-operation"
                : "Post-operation"
            );
          }
          if (success.rank) {
            setExecutionOrder(success.rank);
          }
          if (success.configuration) {
            setUnsecureConfig(success.configuration);
          }
          if (success.filteringattributes) {
            setSelectedAttribs(
              (success.filteringattributes as string).split(",")
            );
          }
          if (success.name) {
            setStepName(success.name);
          }
          setDefaulted(true);
        },
        (error) => {
          //handle error with a modal popup
          console.log(error);
        }
      );
  }

  //Get Tables
  if (allTables.length === 0) {
    props.context.webAPI
      .retrieveMultipleRecords(
        "entity",
        "?$select=collectionname,logicalname&$filter=collectionname ne null"
      )
      .then((success) => {
        let tables: IComboBoxOption[] = [];
        success.entities.forEach((x) => {
          tables.push({
            key: x.logicalname,
            text: x.logicalname,
          } as IComboBoxOption);
        });
        setAllTables(
          tables.sort((a, b) => {
            return a.text.localeCompare(b.text);
          })
        );
      });
  }

  if (
    unsecureConfig !=
    window.location.href.split("=")[window.location.href.split("=").length - 1]
  ) {
    setUnsecureConfig(
      window.location.href.split("=")[
        window.location.href.split("=").length - 1
      ]
    );
  }

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
      defaultStepName(option?.key.toString(), selectedMessage);
    },
    []
  );
  const onDefaultPrimaryTable = React.useCallback((option: string) => {
    setPrimaryTable(option);
    getTableAttributes(option);
    defaultStepName(option, selectedMessage);
  }, []);
  const onChangeSelectedMessage = React.useCallback(
    (
      _: React.FormEvent<HTMLElement | HTMLInputElement> | undefined,
      option?: IChoiceGroupOption | undefined
    ) => {
      setSelectedMessage(option?.text as Register.sdkMessage);
      defaultStepName(primaryTable, option?.text as Register.sdkMessage);
    },
    []
  );
  const onChangeStepName = React.useCallback(
    (
      event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
      newValue?: string
    ) => {
      setStepName(newValue);
      if (newValue) {
        setFormReady(true);
      } else {
        setFormReady(false);
      }
    },
    []
  );
  // const onChangeSecureConfig = React.useCallback(
  //   (
  //     event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
  //     newValue?: string
  //   ) => {
  //     setSecureConfig(newValue);
  //   },
  //   []
  // );
  // const onChangeUnsecureConfig = React.useCallback(
  //   (
  //     event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
  //     newValue?: string
  //   ) => {
  //     setUnsecureConfig(newValue);
  //   },
  //   []
  // );
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
  const onDismissDialog = React.useCallback(() => {
    setPrimaryTable(undefined);
  }, []);
  const onResolveFilterAttributes = (
    filterText: string,
    selectedItems: ITag[] | undefined
  ): ITag[] => {
    return filterText
      ? allAttributes
          .filter((attr) => {
            return (
              attr.toLowerCase().indexOf(filterText.toLowerCase()) !== -1 &&
              (!selectedItems ||
                selectedItems.length === 0 ||
                selectedItems.filter((x) => x.key !== attr).length ===
                  selectedItems?.length)
            );
          })
          .map((x) => {
            return { key: x, name: x };
          })
      : [];
  };
  const getTableAttributes = React.useCallback(
    (tablename: string | undefined) => {
      if (tablename) {
        props.context.utils.getEntityMetadata(tablename).then(
          (success) => {
            setFormReady(true);
            setAllAttributes(success._entityDescriptor.AttributeNames);
          },
          (err) => {
            console.log(err);
          }
        );
      } else {
        setFormReady(false);
      }
    },
    []
  );
  const defaultStepName = function (
    tablename: string | undefined,
    messageName: Register.sdkMessage
  ) {
    if (tablename) {
      setStepName(`${props.pluginName}: ${messageName} of ${tablename}`);
    } else if (primaryTable) {
      setStepName(`${props.pluginName}: ${messageName} of ${primaryTable}`);
    }
  };
  const onClickRegister = () => {
    let registration: Register.step = {
      Id: props.stepId,
      StepName: stepName!,
      SdkMessage: selectedMessage,
      Stage: selectedStage,
      Mode: selectedMode,
      primaryTable: primaryTable!,
      secondaryTable: "",
      executionOrder: executionOrder,
      description: "A Power Fx Plugin",
      unsecureConfig: unsecureConfig ?? "",
      secureConfig: secureConfig ?? "",
      filterAttributes: selectedAttribs,
    };
    props.callback(registration);
  };
  //#endregion

  return (
    <>
      <Dialog
        hidden={hasRows}
        onDismiss={onDismissDialog}
        dialogContentProps={_dialogContentProps}
      >
        <DialogFooter>
          <PrimaryButton onClick={() => setHasRows(true)} text="OK" />
        </DialogFooter>
      </Dialog>
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
                text={primaryTable}
                disabled={unsecureConfig?.indexOf("-") === -1}
              />
            </StackItem>
            {/* sdkMessage */}
            <StackItem align="baseline">
              <ChoiceGroup
                options={sdkMessageChoices}
                defaultChecked={true}
                selectedKey={selectedMessage.toString()}
                onChange={onChangeSelectedMessage}
                label="Select the SDK Message"
                required={true}
                disabled={unsecureConfig?.indexOf("-") === -1}
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
                  selectedItems={selectedAttribs.map((x) => {
                    return { key: x, name: x };
                  })}
                />
              </Stack>
            </StackItem>
            {/* Stage */}
            <StackItem align="baseline">
              <ChoiceGroup
                options={stageChoices}
                disabled={!formReady}
                defaultChecked={true}
                selectedKey={selectedStage}
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
                selectedKey={selectedMode}
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
                value={executionOrder.toString()}
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
                rows={15}
                disabled={true}
                styles={{ root: { textAlign: "left", width: 225 } }}
                //onChange={onChangeUnsecureConfig}
                value={
                  unsecureConfig?.indexOf("-") === -1 ? "" : unsecureConfig
                }
              />
            </StackItem>
            {/* secure: leaving this out for now: rendering a secureconfig in plaintext on a record seems to defeat the point, doesn't it? */}
            {/* <StackItem align="baseline">
              <TextField
                label="Secure Config"
                multiline
                autoAdjustHeight
                rows={7}
                styles={{ root: { textAlign: "left", width: 225 } }}
                onChange={onChangeSecureConfig}
                disabled={!formReady}
              />
            </StackItem> */}
            {/* go button */}
          </Stack>
        </Stack>
        <StackItem
          align="center"
          styles={{ root: { width: 525, textAlign: "center" } }}
        >
          <PrimaryButton
            text={props.stepId ? "Update Plugin" : "Register Plugin"}
            onClick={onClickRegister}
            allowDisabledFocus
            disabled={!formReady}
            styles={{ root: { textAlign: "center" } }}
          />
        </StackItem>
      </Stack>
    </>
  );
};
