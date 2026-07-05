import React from "react";

import { Box, Text } from "ink";

import { StatsBarProps } from "./stats-bar.type";

// Per-translation metrics rendered above the input: elapsed wall-clock time,
// token usage (total, with prompt ↑ / completion ↓ split) and tok/s throughput.
export const StatsBar = ({ stats }: StatsBarProps) => {
  const seconds = (stats.elapsedMs / 1000).toFixed(2);
  const tps = stats.tokensPerSecond.toFixed(1);

  return (
    <Box>
      <Text dimColor>
        {" "}
        Stats: {seconds}s │ {stats.totalTokens} tok ({stats.promptTokens}↑{" "}
        {stats.completionTokens}↓) │ {tps} tok/s{" "}
      </Text>
    </Box>
  );
};
