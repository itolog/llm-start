import React from "react";

import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";

import { TempPicker } from "./temp-picker.component";

// Terminal escape sequences for the keys TempPicker's useInput handles.
// Built from char codes to keep the source free of invisible control bytes.
const ESC = String.fromCharCode(27);
const KEY = {
  left: `${ESC}[D`,
  right: `${ESC}[C`,
  enter: "\r",
  esc: ESC,
};

// ink attaches its stdin listener in a mount effect and flushes renders
// asynchronously, so let the event loop turn around each keypress.
const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

function setup(initial: number) {
  const onSelect = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    React.createElement(TempPicker, { initial, onSelect, onCancel }),
  );
  return { ...utils, onSelect, onCancel };
}

describe("TempPicker", () => {
  it("shows the initial value", () => {
    const { lastFrame } = setup(0.5);
    expect(lastFrame()).toContain("0.5");
  });

  it("increments by 0.1 on right arrow", async () => {
    const { lastFrame, stdin } = setup(0.5);
    await tick();
    stdin.write(KEY.right);
    await tick();
    expect(lastFrame()).toContain("0.6");
  });

  it("decrements by 0.1 on left arrow", async () => {
    const { lastFrame, stdin } = setup(0.5);
    await tick();
    stdin.write(KEY.left);
    await tick();
    expect(lastFrame()).toContain("0.4");
  });

  it("clamps at the upper bound of 2", async () => {
    const { lastFrame, stdin } = setup(2);
    await tick();
    stdin.write(KEY.right);
    await tick();
    expect(lastFrame()).toContain("2.0");
  });

  it("clamps at the lower bound of 0", async () => {
    const { lastFrame, stdin } = setup(0);
    await tick();
    stdin.write(KEY.left);
    await tick();
    expect(lastFrame()).toContain("0.0");
  });

  it("applies the adjusted value on Enter", async () => {
    const { stdin, onSelect } = setup(0.5);
    await tick();
    stdin.write(KEY.right);
    await tick();
    stdin.write(KEY.enter);
    await tick();
    expect(onSelect).toHaveBeenCalledWith(0.6);
  });

  it("cancels on Esc without selecting", async () => {
    const { stdin, onSelect, onCancel } = setup(0.5);
    await tick();
    stdin.write(KEY.esc);
    await tick();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
