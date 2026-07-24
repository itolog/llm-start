import React from "react";

import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";

import { InputBar } from "./input-bar.component";

const ESC = String.fromCharCode(27);
const KEY = {
  up: `${ESC}[A`,
  down: `${ESC}[B`,
  tab: "\t",
  enter: "\r",
  esc: ESC,
};

// ink attaches its stdin listener in a mount effect and flushes renders
// asynchronously, so let the event loop turn around each keypress.
const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

function setup(value: string, { isLoading = false } = {}) {
  const onChange = vi.fn();
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    React.createElement(InputBar, {
      value,
      onChange,
      onSubmit,
      isLoading,
      onCancel,
    }),
  );
  return { ...utils, onChange, onSubmit, onCancel };
}

describe("InputBar", () => {
  it("shows the command suggestions while a `/`-prefix is typed", () => {
    const { lastFrame } = setup("/");
    const frame = lastFrame() ?? "";
    expect(frame).toContain("/from");
    expect(frame).toContain("Set the source language");
  });

  it("hides suggestions for plain (non-command) text", () => {
    const { lastFrame } = setup("hello");
    expect(lastFrame()).not.toContain("Set the source language");
  });

  it("renders the suggestions above the prompt row", () => {
    const { lastFrame } = setup("/");
    const lines = (lastFrame() ?? "").split("\n");
    const suggestionLine = lines.findIndex((l) =>
      l.includes("Set the source language"),
    );
    // The prompt is the only line starting with the yellow "> " marker.
    const promptLine = lines.findIndex((l) => l.trimStart().startsWith(">"));

    expect(suggestionLine).toBeGreaterThanOrEqual(0);
    expect(promptLine).toBeGreaterThanOrEqual(0);
    expect(suggestionLine).toBeLessThan(promptLine);
  });

  it("Tab completes to the first suggestion", async () => {
    const { stdin, onChange } = setup("/");
    await tick();
    stdin.write(KEY.tab);
    await tick();
    expect(onChange).toHaveBeenCalledWith("/from ");
  });

  it("arrow-down moves the selection before Tab completes", async () => {
    const { stdin, onChange } = setup("/");
    await tick();
    stdin.write(KEY.down);
    await tick();
    stdin.write(KEY.tab);
    await tick();
    expect(onChange).toHaveBeenCalledWith("/to ");
  });

  it("narrows suggestions by prefix and completes the match", async () => {
    const { stdin, onChange, lastFrame } = setup("/te");
    const frame = lastFrame() ?? "";
    expect(frame).toContain("/temp");
    expect(frame).not.toContain("Set the source language");

    await tick();
    stdin.write(KEY.tab);
    await tick();
    expect(onChange).toHaveBeenCalledWith("/temp ");
  });

  it("Esc dismisses the suggestions", async () => {
    const { stdin, lastFrame } = setup("/");
    await tick();
    stdin.write(KEY.esc);
    await tick();
    expect(lastFrame()).not.toContain("Set the source language");
  });

  it("Esc stops a running translation when no suggestions are open", async () => {
    const { stdin, onCancel } = setup("hello", { isLoading: true });
    await tick();
    stdin.write(KEY.esc);
    await tick();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Esc dismisses the dropdown instead of cancelling while suggestions are open", async () => {
    const { stdin, onCancel, lastFrame } = setup("/", { isLoading: true });
    await tick();
    stdin.write(KEY.esc);
    await tick();

    // exactly one handler reacts: the dropdown closes, the request keeps running
    expect(lastFrame()).not.toContain("Set the source language");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("Esc does nothing when idle", async () => {
    const { stdin, onCancel } = setup("hello");
    await tick();
    stdin.write(KEY.esc);
    await tick();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("submits plain text on Enter (no suggestions open)", async () => {
    const { stdin, onSubmit } = setup("hello");
    await tick();
    stdin.write(KEY.enter);
    await tick();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("Enter completes instead of submitting while suggestions are open", async () => {
    const { stdin, onSubmit, onChange } = setup("/");
    await tick();
    stdin.write(KEY.enter);
    await tick();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith("/from ");
  });
});
