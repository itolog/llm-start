import React from "react";
import { Box } from "ink";
import { useLangSettings } from "./hooks/useLangSettings.js";
import { useChat } from "./hooks/useChat.js";
import { Header } from "./components/Header.js";
import { SettingsBar } from "./components/SettingsBar.js";
import { MessageList } from "./components/MessageList.js";
import { InputBar } from "./components/InputBar.js";

export const App = () => {
  const { fromLang, toLang, setFromLang, setToLang } = useLangSettings();
  const { messages, isLoading, input, setInput, submit } = useChat({
    fromLang,
    toLang,
    setFromLang,
    setToLang,
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header />
      <SettingsBar fromLang={fromLang} toLang={toLang} />
      <MessageList messages={messages} isLoading={isLoading} />
      <InputBar value={input} onChange={setInput} onSubmit={submit} />
    </Box>
  );
};
