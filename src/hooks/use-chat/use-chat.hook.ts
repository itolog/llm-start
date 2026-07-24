import { useCallback, useState } from "react";

import { useApp } from "ink";
import { match } from "ts-pattern";

import { useMessages } from "@/hooks/use-messages";
import { useModel } from "@/hooks/use-model";
import { useTranslation } from "@/hooks/use-translation";
import { createMessage } from "@/utils/create-message";
import { parseCommand } from "@/utils/parse-command";

import { UseChatOptions } from "./use-chat.type";
import { getCommandCategory } from "./utils/command-category";

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

  const {
    isLoading,
    stats,
    handleTranslate,
    resetStats,
    cancel: cancelTranslation,
  } = useTranslation({
    fromLang,
    toLang,
    modelAvailableRef,
    addMessage,
    appendMessage,
    updateMessage,
  });

  // /clear wipes both the transcript and the last request's stats — otherwise
  // the StatsBar would linger under an empty chat.
  const clearChat = useCallback(() => {
    clear();
    resetStats();
  }, [clear, resetStats]);

  // Appends the commands reference (rendered by CommandsHelp).
  const showHelp = useCallback(() => {
    appendMessage(createMessage("Bot", "", "commands"));
  }, [appendMessage]);

  const submit = useCallback(async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    const command = parseCommand(userText);

    // Interrupt-first: only a *new translation* is gated while one is
    // streaming — pure commands (/help, /exit, …) and chain-affecting ones
    // (/model, /temp, which apply to the next request) stay usable. The input
    // is kept so the user can stop the running request and resubmit as is.
    if (isLoading && getCommandCategory(command) === "translate") {
      addMessage(
        "Bot",
        "A translation is still running — press Esc to stop it, then send again.",
      );
      return;
    }

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
      .with({ type: "clear" }, clearChat)
      .with({ type: "help" }, showHelp)
      .with({ type: "exit" }, () => exit())
      .with({ type: "translate" }, ({ text }) => handleTranslate(text))
      .exhaustive();
  }, [
    input,
    isLoading,
    addMessage,
    clearChat,
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
    cancelTranslation,
    clear: clearChat,
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
