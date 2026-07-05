import React, { useState } from "react";

import { Box } from "ink";
import { match, P } from "ts-pattern";

import { Header } from "@/components/header";
import { InputBar } from "@/components/input-bar";
import { LiveTimer } from "@/components/live-timer";
import { MessageList } from "@/components/message-list";
import { ModelPicker } from "@/components/model-picker";
import { SettingsBar } from "@/components/settings-bar";
import { StatsBar } from "@/components/stats-bar";
import { TempPicker } from "@/components/temp-picker";
import { config } from "@/config";
import { useChat } from "@/hooks/use-chat";

export const App = () => {
  const [fromLang, setFromLang] = useState("english");
  const [toLang, setToLang] = useState("polish");
  const [model, setModel] = useState(config.MODEL);
  const [temp, setTemp] = useState(config.LLM_TEMP);
  const {
    messages,
    isLoading,
    input,
    setInput,
    submit,
    stats,
    modelItems,
    selectModel,
    cancelModelPicker,
    tempPickerOpen,
    selectTemp,
    cancelTempPicker,
  } = useChat({
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
      <MessageList messages={messages} />

      {match({ isLoading, stats })
        .with({ isLoading: true }, () => <LiveTimer />)
        .with({ stats: P.nonNullable }, ({ stats }) => (
          <StatsBar stats={stats} />
        ))
        .otherwise(() => null)}

      {match({ modelItems, tempPickerOpen })
        .with({ modelItems: P.nonNullable }, ({ modelItems }) => (
          <ModelPicker
            items={modelItems}
            onSelect={selectModel}
            onCancel={cancelModelPicker}
          />
        ))
        .with({ tempPickerOpen: true }, () => (
          <TempPicker
            initial={temp}
            onSelect={selectTemp}
            onCancel={cancelTempPicker}
          />
        ))
        .otherwise(() => (
          <InputBar value={input} onChange={setInput} onSubmit={submit} />
        ))}
    </Box>
  );
};
