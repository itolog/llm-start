import React, { useState } from "react";

import { Box } from "ink";

import { Header } from "@/components/header";
import { InputBar } from "@/components/input-bar";
import { MessageList } from "@/components/message-list";
import { SettingsBar } from "@/components/settings-bar";
import { config } from "@/config";
import { useChat } from "@/hooks/use-chat";

export const App = () => {
  const [fromLang, setFromLang] = useState("english");
  const [toLang, setToLang] = useState("polish");
  const [model, setModel] = useState(config.MODEL);
  const [temp, setTemp] = useState(config.LLM_TEMP);
  const { messages, isLoading, input, setInput, submit } = useChat({
    fromLang,
    toLang,
    setFromLang,
    setToLang,
    setModel,
    setTemp,
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header />
      <SettingsBar
        fromLang={fromLang}
        toLang={toLang}
        model={model}
        temp={temp}
      />
      <MessageList messages={messages} isLoading={isLoading} />
      <InputBar value={input} onChange={setInput} onSubmit={submit} />
    </Box>
  );
};
