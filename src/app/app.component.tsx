import React, { useState } from "react";

import { Box, useWindowSize } from "ink";
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
  const { rows } = useWindowSize();
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

  // ! minHeight + flex-end keeps the frame at least terminal-height with the
  // prompt pinned to the bottom edge. Without it the frame height oscillates
  // around `stdout.rows` when transient UI (command suggestions) opens/closes,
  // and Ink's two rendering modes (in-place erase vs. full-screen repaint)
  // disagree on where to anchor the frame — the shrunk frame gets repainted at
  // the TOP of the screen, leaving a stale blank region under the prompt.
  return (
    <Box
      flexDirection="column"
      padding={1}
      minHeight={rows}
      justifyContent="flex-end">
      <Header />
      <MessageList messages={messages} />

      {match({ isLoading, stats })
        .with({ isLoading: true }, () => <LiveTimer />)
        .with({ stats: P.nonNullable }, ({ stats }) => (
          <StatsBar stats={stats} />
        ))
        .otherwise(() => null)}

      {/* SettingsBar sits at the tail of the tree, right above the prompt, so it
          stays visible no matter how long the chat history grows (Ink shows the
          bottom of the output). */}
      <SettingsBar
        fromLang={fromLang}
        toLang={toLang}
        model={model}
        temp={temp}
      />

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
