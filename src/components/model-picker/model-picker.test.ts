import React from "react";

import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";

import { ModelPicker } from "./model-picker.component";

const ESC = String.fromCharCode(27);
const KEY = {
  up: `${ESC}[A`,
  down: `${ESC}[B`,
  enter: "\r",
  esc: ESC,
};

// ink attaches its stdin listener in a mount effect and flushes renders
// asynchronously, so let the event loop turn around each keypress.
const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

function setup(items: string[]) {
  const onSelect = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    React.createElement(ModelPicker, { items, onSelect, onCancel }),
  );
  return { ...utils, onSelect, onCancel };
}

describe("ModelPicker", () => {
  it("lists the models and the hint", () => {
    const { lastFrame } = setup(["gemma3:4b", "llama3"]);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("gemma3:4b");
    expect(frame).toContain("llama3");
    expect(frame).toContain("Select a model");
  });

  it("selects the highlighted (first) item on Enter", async () => {
    const { stdin, onSelect } = setup(["gemma3:4b", "llama3"]);
    await tick();
    stdin.write(KEY.enter);
    await tick();
    expect(onSelect).toHaveBeenCalledWith("gemma3:4b");
  });

  it("moves the highlight down before selecting", async () => {
    const { stdin, onSelect } = setup(["gemma3:4b", "llama3"]);
    await tick();
    stdin.write(KEY.down);
    await tick();
    stdin.write(KEY.enter);
    await tick();
    expect(onSelect).toHaveBeenCalledWith("llama3");
  });

  it("cancels on Esc without selecting", async () => {
    const { stdin, onSelect, onCancel } = setup(["gemma3:4b"]);
    await tick();
    stdin.write(KEY.esc);
    await tick();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
