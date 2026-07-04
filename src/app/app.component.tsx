import React from "react";

import { Box } from "ink";

import { Header } from "@/components/header";
import { InputBar } from "@/components/input-bar";
import { MessageList } from "@/components/message-list";
import { SettingsBar } from "@/components/settings-bar";
import { useChat } from "@/hooks/use-chat";
import { useLangSettings } from "@/hooks/use-lang-settings";

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
