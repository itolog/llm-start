import React from "react";

import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The service reaches Ollama over the network on mount (resolveStartupModel);
// stub the whole surface so the smoke test is hermetic and deterministic.
const { mockResolveStartup } = vi.hoisted(() => ({
  mockResolveStartup: vi.fn(),
}));

vi.mock("@/services/llm-model", () => ({
  llmModelService: {
    resolveStartupModel: mockResolveStartup,
    checkModelAvailable: vi.fn().mockResolvedValue(true),
    translate: vi.fn(),
    listModels: vi.fn(),
    setModel: vi.fn(),
    setTemperature: vi.fn(),
    // External-store surface read via useSyncExternalStore (useModel).
    subscribe: () => () => {},
    getModel: () => "gemma4:12b-mlx",
    getTemperature: () => 0.1,
  },
}));

import { App } from "./app.component";

// ink attaches its stdin listener in a mount effect and flushes renders
// asynchronously, so let the event loop turn around each keypress.
const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

const lastNonEmptyLine = (frame: string): string => {
  const lines = frame.split("\n");
  let i = lines.length - 1;
  while (i >= 0 && lines[i].trim() === "") i--;
  return i >= 0 ? lines[i] : "";
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveStartup.mockResolvedValue({ status: "ok" });
});

describe("App", () => {
  it("renders the header settings, welcome message, and prompt", async () => {
    const { lastFrame, unmount } = render(React.createElement(App));

    const frame = lastFrame() ?? "";
    // Settings bar (source → target language)
    expect(frame).toContain("english → polish");
    // Welcome message card renders the commands reference (kind "commands")
    expect(frame).toContain("Set the source language");
    // Input prompt placeholder
    expect(frame).toContain("help for commands");

    // The startup model resolution runs from a mount effect.
    expect(mockResolveStartup).toHaveBeenCalledTimes(1);

    // Flush the resolved startup promise before tearing down.
    await Promise.resolve();
    unmount();
  });

  it("keeps the prompt as the bottom line when command suggestions open", async () => {
    const { stdin, lastFrame, unmount } = render(React.createElement(App));
    await tick();

    // Prompt is the bottom line before any suggestions.
    expect(lastNonEmptyLine(lastFrame() ?? "").trimStart()).toMatch(/^>/);

    // Typing "/" opens the command suggestions; they render *above* the prompt,
    // so the prompt must still be the bottom line (it would not be if the
    // dropdown rendered below it).
    stdin.write("/");
    await tick();

    const bottom = lastNonEmptyLine(lastFrame() ?? "").trimStart();
    expect(bottom).toMatch(/^>/);
    expect(bottom).toContain("/");

    unmount();
  });
});
