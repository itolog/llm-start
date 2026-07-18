// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Message } from "@/types/message.type";

import { UseTranslationOptions } from "./use-translation.type";

const { mockTranslate } = vi.hoisted(() => ({ mockTranslate: vi.fn() }));

vi.mock("@/services/llm-model", () => ({
  llmModelService: { translate: mockTranslate },
}));

import { useTranslation } from "./use-translation.hook";

const fakeStats = {
  elapsedMs: 100,
  promptTokens: 1,
  completionTokens: 2,
  totalTokens: 3,
  tokensPerSecond: 20,
};
const translationResult = (text: string) => ({ text, stats: fakeStats });

function setup(overrides: Partial<UseTranslationOptions> = {}) {
  const addMessage = vi.fn();
  const appendMessage = vi.fn<(message: Message) => void>();
  const updateMessage = vi.fn();
  const options: UseTranslationOptions = {
    fromLang: "english",
    toLang: "polish",
    modelAvailableRef: { current: true },
    addMessage,
    appendMessage,
    updateMessage,
    ...overrides,
  };
  const utils = renderHook(() => useTranslation(options));
  return { ...utils, addMessage, appendMessage, updateMessage };
}

// The id of the bot message appended up front (updateMessage targets it).
const appendedId = (appendMessage: ReturnType<typeof vi.fn>) =>
  (appendMessage.mock.calls[0][0] as Message).id;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useTranslation", () => {
  it("blocks translation when the model is unavailable", async () => {
    const { result, addMessage } = setup({
      modelAvailableRef: { current: false },
    });

    await act(async () => {
      await result.current.handleTranslate("hello");
    });

    expect(mockTranslate).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith(
      "Bot",
      expect.stringContaining("is not available"),
    );
  });

  it("adds the user line, streams into the bot line, and stores stats", async () => {
    mockTranslate.mockImplementation(
      async ({ onToken }: { onToken?: (partial: string) => void }) => {
        onToken?.("Bon");
        onToken?.("Bonjour");
        return translationResult("Bonjour");
      },
    );
    const { result, addMessage, appendMessage, updateMessage } = setup();

    await act(async () => {
      await result.current.handleTranslate("hello");
    });

    expect(addMessage).toHaveBeenCalledWith("You", "hello");
    expect(mockTranslate).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "hello",
        fromLang: "english",
        toLang: "polish",
        signal: expect.anything(),
      }),
    );
    const id = appendedId(appendMessage);
    expect(updateMessage).toHaveBeenCalledWith(id, "Bonjour");
    expect(result.current.stats).toMatchObject(fakeStats);
    expect(result.current.isLoading).toBe(false);
  });

  it("falls back to a placeholder for an empty translation", async () => {
    mockTranslate.mockResolvedValue(translationResult(""));
    const { result, appendMessage, updateMessage } = setup();

    await act(async () => {
      await result.current.handleTranslate("hello");
    });

    const id = appendedId(appendMessage);
    expect(updateMessage).toHaveBeenLastCalledWith(id, "(no translation)");
  });

  it("shows a neutral message when the request is aborted", async () => {
    mockTranslate.mockRejectedValue(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    );
    const { result, appendMessage, updateMessage } = setup();

    await act(async () => {
      await result.current.handleTranslate("hello");
    });

    const id = appendedId(appendMessage);
    expect(updateMessage).toHaveBeenLastCalledWith(id, "Request cancelled");
  });

  it("surfaces a generic error as an Error message", async () => {
    mockTranslate.mockRejectedValue(new Error("boom"));
    const { result, appendMessage, updateMessage } = setup();

    await act(async () => {
      await result.current.handleTranslate("hello");
    });

    const id = appendedId(appendMessage);
    expect(updateMessage).toHaveBeenLastCalledWith(id, "Error: boom");
  });
});
