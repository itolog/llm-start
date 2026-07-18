import { useCallback, useState } from "react";

import { useApp } from "ink";
import { match } from "ts-pattern";

import { parseCommand } from "@/commands/parse-command";
import { createMessage } from "@/utils/create-message";

import { useMessages } from "./hooks/use-messages";
import { useModel } from "./hooks/use-model";
import { useTranslation } from "./hooks/use-translation";
import { UseChatOptions } from "./use-chat.type";

// Composes the message, model and translation sub-hooks and owns the one
// concern that spans them: parsing the input and dispatching each `/command`
// (or plain text) to the right sub-hook action.
export function useChat({
  fromLang,
  toLang,
  setFromLang,
  setToLang,
}: UseChatOptions) {
  const { exit } = useApp();
  const [input, setInput] = useState("");

  const { messages, appendMessage, addMessage, updateMessage, clear } =
    useMessages();

  const {
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
  } = useModel({ addMessage });

  const { isLoading, stats, handleTranslate } = useTranslation({
    fromLang,
    toLang,
    modelAvailableRef,
    addMessage,
    appendMessage,
    updateMessage,
  });

  // Appends the commands reference (rendered by CommandsHelp).
  const showHelp = useCallback(() => {
    appendMessage(createMessage("Bot", "", "commands"));
  }, [appendMessage]);

  const submit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const command = parseCommand(userText);

    setInput("");

    await match(command)
      .with({ type: "error" }, ({ message }) => addMessage("Bot", message))
      .with({ type: "from" }, ({ lang }) => {
        setFromLang(lang);
        addMessage("Bot", `Source language changed to: ${lang}`);
      })
      .with({ type: "to" }, ({ lang }) => {
        setToLang(lang);
        addMessage("Bot", `Target language changed to: ${lang}`);
      })
      .with({ type: "model" }, ({ model }) => applyModel(model))
      .with({ type: "models" }, () => openModelPicker())
      .with({ type: "temp" }, ({ temp }) => applyTemp(temp))
      .with({ type: "tempPicker" }, () => openTempPicker())
      .with({ type: "clear" }, clear)
      .with({ type: "help" }, showHelp)
      .with({ type: "exit" }, () => exit())
      .with({ type: "translate" }, ({ text }) => handleTranslate(text))
      .exhaustive();
  }, [
    input,
    isLoading,
    addMessage,
    clear,
    showHelp,
    exit,
    handleTranslate,
    applyModel,
    openModelPicker,
    applyTemp,
    openTempPicker,
    setFromLang,
    setToLang,
  ]);

  return {
    messages,
    isLoading,
    input,
    setInput,
    submit,
    clear,
    stats,
    model,
    temp,
    modelItems,
    selectModel,
    cancelModelPicker,
    tempPickerOpen,
    selectTemp,
    cancelTempPicker,
  };
}
