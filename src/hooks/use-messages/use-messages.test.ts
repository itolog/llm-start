// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// A small history cap keeps the slice test cheap to set up.
vi.mock("@/config", () => ({ appConfig: { MAX_MESSAGES: 3 } }));

import { useMessages } from "./use-messages.hook";

const texts = (result: { current: ReturnType<typeof useMessages> }) =>
  result.current.messages.map((m) => m.text);

describe("useMessages", () => {
  it("starts with a single welcome message", () => {
    const { result } = renderHook(() => useMessages());
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe("Bot");
    expect(result.current.messages[0].text).toContain("Hello! I am a TUI");
  });

  it("addMessage appends a role/text line", () => {
    const { result } = renderHook(() => useMessages());

    act(() => result.current.addMessage("You", "hello"));

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({
      role: "You",
      text: "hello",
    });
  });

  it("updateMessage replaces the text of the matching id only", () => {
    const { result } = renderHook(() => useMessages());

    act(() => result.current.addMessage("Bot", ""));
    const id = result.current.messages[1].id;

    act(() => result.current.updateMessage(id, "filled"));

    expect(result.current.messages[1].text).toBe("filled");
    // the welcome message is untouched
    expect(result.current.messages[0].text).toContain("Hello! I am a TUI");
  });

  it("caps the history at MAX_MESSAGES, dropping the oldest", () => {
    const { result } = renderHook(() => useMessages());

    // welcome + 3 more = 4 > cap of 3 → oldest (welcome) is dropped
    act(() => result.current.addMessage("You", "1"));
    act(() => result.current.addMessage("You", "2"));
    act(() => result.current.addMessage("You", "3"));

    expect(result.current.messages).toHaveLength(3);
    expect(texts(result)).toEqual(["1", "2", "3"]);
  });

  it("clear resets back to the welcome message", () => {
    const { result } = renderHook(() => useMessages());

    act(() => result.current.addMessage("You", "hello"));
    act(() => result.current.clear());

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].text).toContain("Hello! I am a TUI");
  });
});
