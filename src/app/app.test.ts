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
});
