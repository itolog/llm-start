import React, { useEffect, useState } from "react";

import { Box, Text } from "ink";

// Ticks the wall-clock elapsed time while mounted (rendered during an in-flight
// translation, in place of the StatsBar). Resets on each mount.
export const LiveTimer = () => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 100);
    return () => clearInterval(id);
  }, []);

  return (
    <Box>
      <Text dimColor> ⏱ {(elapsedMs / 1000).toFixed(1)}s translating… </Text>
    </Box>
  );
};
