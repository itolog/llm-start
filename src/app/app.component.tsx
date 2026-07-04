import React from "react";
import { Box } from "ink";
import { useLangSettings } from "../hooks/use-lang-settings";
import { useChat } from "../hooks/use-chat";
import { Header } from "../components/header";
import { SettingsBar } from "../components/settings-bar";
import { MessageList } from "../components/message-list";
import { InputBar } from "../components/input-bar";

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
