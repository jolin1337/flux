import { MIXPANEL_TOKEN } from "../../main";
import { getFluxNodeTypeDarkColor } from "../../utils/color";
import { DEFAULT_SETTINGS } from "../../utils/constants";
import { Settings, FluxNodeType } from "../../utils/types";
import { APIKeyInput } from "../utils/APIKeyInput";
import { LabeledSelect, LabeledInput, LabeledSlider } from "../utils/LabeledInputs";

import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Checkbox,
} from "@chakra-ui/react";
import mixpanel from "mixpanel-browser";
import { ChangeEvent, memo } from "react";

const HFInferenceSettings = function({modelSettings, updateSettings}) {
  return (<>
    <LabeledInput mt={4} label="API Base URL" value={modelSettings?.apiBase} setValue={(v) => {
      updateSettings({ ...modelSettings, model: v, apiBase: v })
      if (MIXPANEL_TOKEN) mixpanel.track("Changed Base URL");
    }} />
    <APIKeyInput
      mt={4}
      width="100%"
      apiKey={modelSettings?.apiKey}
      placeholder="hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
      link="https://huggingface.co/settings/tokens"
      setApiKey={(apiKey: string) => {
        updateSettings({...modelSettings, apiKey});
        if (MIXPANEL_TOKEN) mixpanel.track("Changed apiKey");
      }}
    />

    <LabeledSlider
      mt={4}
      label="Temperature (randomness)"
      value={modelSettings?.temperature}
      setValue={(v: number) => {
        updateSettings({ ...modelSettings, temperature: v });
        if (MIXPANEL_TOKEN) mixpanel.track("Changed temperature");
      }}
      color={getFluxNodeTypeDarkColor(FluxNodeType.User)}
      max={1.25}
      min={0}
      step={0.01}
    />

    <LabeledSlider
      mt={3}
      label="Max new tokens"
      value={modelSettings?.max_new_tokens}
      setValue={(v: number) => {
        updateSettings({ ...modelSettings, max_new_tokens: v });
        if (MIXPANEL_TOKEN) mixpanel.track("Changed max new tokens");
      }}
      color={getFluxNodeTypeDarkColor(FluxNodeType.User)}
      max={1024}
      min={1}
      step={1}
    />
  </>);
};
const OpenAISettings = function({availableModels, updateSettings, modelSettings}) {
  return (<>
    <LabeledSelect
      label="Model"
      value={modelSettings?.model}
      options={availableModels || [modelSettings?.model]}
      setValue={(v: string) => {
        updateSettings({ ...modelSettings, model: v });
        if (MIXPANEL_TOKEN) mixpanel.track("Changed model");
      }}
    />
    <APIKeyInput
      mt={4}
      width="100%"
      apiKey={modelSettings?.apiKey}
      setApiKey={(apiKey: string) => {
        updateSettings({...modelSettings, apiKey});
        if (MIXPANEL_TOKEN) mixpanel.track("Changed apiKey");
      }}
    />

    <LabeledSlider
      mt={4}
      label="Temperature (randomness)"
      value={modelSettings?.temperature}
      setValue={(v: number) => {
        updateSettings({ ...modelSettings, temperature: v });
        if (MIXPANEL_TOKEN) mixpanel.track("Changed temperature");
      }}
      color={getFluxNodeTypeDarkColor(FluxNodeType.User)}
      max={1.25}
      min={0}
      step={0.01}
    />

  </>);
};

const ModelSettings = ({modelSettings, updateSettings, removeSettings, availableModels}) => {
  return (<>
    <LabeledSelect
      label="Model Source"
      value={modelSettings?.modelSource}
      options={['openapi', 'hf-inference']}
      setValue={(v: string) => {
        updateSettings({ ...modelSettings, modelSource: v });
      }}
    />
    {modelSettings?.modelSource === 'openapi' && <OpenAISettings updateSettings={updateSettings} modelSettings={modelSettings} availableModels={availableModels}/>}
    {modelSettings?.modelSource === 'hf-inference' && <HFInferenceSettings updateSettings={updateSettings} modelSettings={modelSettings}/>}
    <Button color="red" onClick={removeSettings}>Remove</Button>
    <hr style={{margin: 15}}/>
  </>);
};

export const SettingsModal = memo(function SettingsModal({
  isOpen,
  onClose,
  settings,
  setSettings,
  apiKey,
  setApiKey,
  availableModels
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  setSettings: (settings: Settings) => void;
  apiKey: string | null;
  setApiKey: (apiKey: string) => void;
  availableModels: string[] | null;
}) {
  const reset = () => {
    if (
      confirm(
        "Are you sure you want to reset your settings to default? This cannot be undone!"
      )
    ) {
      setSettings(DEFAULT_SETTINGS);

      if (MIXPANEL_TOKEN) mixpanel.track("Restored defaults");
    }
  };

  const hardReset = () => {
    if (
      confirm(
        "Are you sure you want to delete ALL data (including your saved API key, conversations, etc?) This cannot be undone!"
      ) &&
      confirm(
        "Are you 100% sure? Reminder this cannot be undone and you will lose EVERYTHING!"
      )
    ) {
      // Clear local storage.
      localStorage.clear();

      // Ensure that the page is reloaded even if there are unsaved changes.
      window.onbeforeunload = null;

      // Reload the window.
      window.location.reload();

      if (MIXPANEL_TOKEN) mixpanel.track("Performed hard reset");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {settings?.models?.map((modelSettings, i) => (
            <ModelSettings
              key={i}
              modelSettings={modelSettings}
              removeSettings={() => setSettings({...settings, models: settings.models.filter((_, j) => j !== i)})}
              updateSettings={(newModelSettings) => {
                const models = [...settings.models];
                models[i] = newModelSettings;
                setSettings({...settings, models });
              }}
              availableModels={availableModels}
            />
          ))}
          <div>
          <Button onClick={() => setSettings({...settings, models: [...(settings?.models || []), {modelSource: 'openai'}]})} mr={3} color="blue">
            Add model
          </Button>
          </div>

          <LabeledSlider
            mt={3}
            label="Number of Responses"
            value={settings?.n}
            setValue={(v: number) => {
              setSettings({ ...settings, n: v });
              if (MIXPANEL_TOKEN) mixpanel.track("Changed number of responses");
            }}
            color={getFluxNodeTypeDarkColor(FluxNodeType.User)}
            max={10}
            min={1}
            step={1}
          />
          <Checkbox
            mt={3}
            fontWeight="bold"
            isChecked={settings.autoZoom}
            colorScheme="gray"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setSettings({ ...settings, autoZoom: event.target.checked });

              if (MIXPANEL_TOKEN) mixpanel.track("Changed auto zoom");
            }}
          >
            Auto Zoom
          </Checkbox>
        </ModalBody>

        <ModalFooter>
          <Button mb={2} onClick={reset} mr={3} color="orange">
            Restore Defaults
          </Button>

          <Button mb={2} onClick={hardReset} mr="auto" color="red">
            Hard Reset
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});
