import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { match } from "ts-pattern";

import { llmModelService } from "@/services/llm-model";

import { UseModelOptions } from "./use-model.type";

// Owns model/temperature runtime state: the picker/stepper visibility, the
// startup resolution + availability tracking, and the apply/select/cancel
// actions shared by the `/model`|`/temp` commands and their interactive UIs.
// The active model/temperature are read straight from the service (the single
// source of truth) via useSyncExternalStore, so switching them re-renders the
// UI without a duplicate copy in component state. `modelAvailableRef` is
// exposed so the translation flow can block requests against a model Ollama
// does not have pulled.
export function useModel({ addMessage }: UseModelOptions) {
  const model = useSyncExternalStore(
    llmModelService.subscribe,
    llmModelService.getModel,
  );
  const temp = useSyncExternalStore(
    llmModelService.subscribe,
    llmModelService.getTemperature,
  );

  // Non-null while the model picker is open (holds the installed model tags).
  const [modelItems, setModelItems] = useState<string[] | null>(null);
  const [tempPickerOpen, setTempPickerOpen] = useState(false);

  const modelAvailableRef = useRef<boolean | null>(null);

  // Re-check the active model after a manual /model switch (it may not be
  // pulled) and warn if it is missing.
  const verifyModel = useCallback(async () => {
    const available = await llmModelService.checkModelAvailable();
    modelAvailableRef.current = available;
    if (!available) {
      const active = llmModelService.getModel();
      addMessage(
        "Bot",
        `Error: Model "${active}" is not available. Please pull the model first using: ollama pull ${active}`,
      );
    }
  }, [addMessage]);

  // Startup: adapt to whatever Ollama has installed instead of trusting the
  // configured default blindly (it may not be pulled on this machine).
  const initModel = useCallback(async () => {
    const result = await llmModelService.resolveStartupModel();

    match(result)
      .with({ status: "no-models" }, () => {
        modelAvailableRef.current = false;
        addMessage(
          "Bot",
          "No models are installed. Pull one first, e.g.: ollama pull gemma3:4b",
        );
      })
      .with({ status: "fallback" }, ({ model }) => {
        const wanted = llmModelService.getModel();
        llmModelService.setModel(model);
        addMessage(
          "Bot",
          `Model "${wanted}" is not installed — switched to "${model}". Use /model to pick another.`,
        );
        modelAvailableRef.current = true;
      })
      .with({ status: "ok" }, () => {
        modelAvailableRef.current = true;
      })
      .exhaustive();
  }, [addMessage]);

  useEffect(() => {
    initModel();
  }, [initModel]);

  // Switches the active model (shared by `/model <name>` and the picker).
  const applyModel = useCallback(
    async (model: string) => {
      llmModelService.setModel(model);
      addMessage("Bot", `Model changed to: ${model}`);
      await verifyModel();
    },
    [addMessage, verifyModel],
  );

  // Opens the interactive picker for bare `/model` — unless nothing is
  // installed, in which case it reports instead of showing an empty list.
  const openModelPicker = useCallback(async () => {
    const items = await llmModelService.listModels();
    if (items.length === 0) {
      addMessage("Bot", "No models found. Pull one first: ollama pull <name>");
      return;
    }
    setModelItems(items);
  }, [addMessage]);

  const selectModel = useCallback(
    async (model: string) => {
      setModelItems(null);
      await applyModel(model);
    },
    [applyModel],
  );

  const cancelModelPicker = useCallback(() => setModelItems(null), []);

  // Updates the sampling temperature (shared by `/temp <value>` and the stepper).
  const applyTemp = useCallback(
    (temp: number) => {
      llmModelService.setTemperature(temp);
      addMessage("Bot", `Temperature changed to: ${temp}`);
    },
    [addMessage],
  );

  const openTempPicker = useCallback(() => setTempPickerOpen(true), []);

  const selectTemp = useCallback(
    (temp: number) => {
      setTempPickerOpen(false);
      applyTemp(temp);
    },
    [applyTemp],
  );

  const cancelTempPicker = useCallback(() => setTempPickerOpen(false), []);

  return {
    model,
    temp,
    modelItems,
    tempPickerOpen,
    modelAvailableRef,
    applyModel,
    openModelPicker,
    selectModel,
    cancelModelPicker,
    applyTemp,
    openTempPicker,
    selectTemp,
    cancelTempPicker,
  };
}
