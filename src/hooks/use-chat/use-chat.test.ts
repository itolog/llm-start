// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UseChatOptions } from "./use-chat.type";

// Shared mocks, hoisted so the vi.mock factories below can close over them.
const { mockExit, mockInvoke, mockCheckModel } = vi.hoisted(() => ({
  mockExit: vi.fn(),
  mockInvoke: vi.fn(),
  mockCheckModel: vi.fn(),
}));

vi.mock("ink", () => ({ useApp: () => ({ exit: mockExit }) }));
vi.mock("@/llm-model", () => ({
  translationChain: { invoke: mockInvoke },
  checkModelAvailable: mockCheckModel,
}));
// Pass-through: retry logic itself is covered in with-retry.test.ts, and this
// keeps the retry delay / timeout out of the hook tests.
vi.mock("@/utils/with-retry", () => ({
  withRetry: (fn: () => Promise<unknown>) => fn(),
}));

import { useChat } from "./use-chat.hook";

function setup(overrides: Partial<UseChatOptions> = {}) {
  const setFromLang = vi.fn();
  const setToLang = vi.fn();
  const options: UseChatOptions = {
    fromLang: "english",
    toLang: "polish",
    setFromLang,
    setToLang,
    ...overrides,
  };
  const utils = renderHook(() => useChat(options));
  return { ...utils, setFromLang, setToLang };
}

// Drive one submit: set the input, then call submit.
async function submitText(
  result: { current: ReturnType<typeof useChat> },
  text: string,
) {
  act(() => result.current.setInput(text));
  await act(async () => {
    await result.current.submit();
  });
}

const texts = (result: { current: ReturnType<typeof useChat> }) =>
  result.current.messages.map((m) => m.text);

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckModel.mockResolvedValue(true);
});

describe("useChat", () => {
  it("starts with a single welcome message and not loading", () => {
    const { result } = setup();
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe("Bot");
    expect(result.current.isLoading).toBe(false);
  });

  it("translates: adds the user line and the cleaned bot reply", async () => {
    mockInvoke.mockResolvedValue({ text: "  bonjour  " });
    const { result } = setup();

    await submitText(result, "hello");

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith(
      { input_language: "english", output_language: "polish", input: "hello" },
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(texts(result)).toContain("hello");
    expect(texts(result)).toContain("bonjour");
    expect(result.current.isLoading).toBe(false);
  });

  it("shows a neutral message when the request is aborted", async () => {
    const abortError = Object.assign(new Error("aborted"), {
      name: "AbortError",
    });
    mockInvoke.mockRejectedValue(abortError);
    const { result } = setup();

    await submitText(result, "hello");

    expect(texts(result)).toContain("Request cancelled");
  });

  it("surfaces a generic error as an Error message", async () => {
    mockInvoke.mockRejectedValue(new Error("boom"));
    const { result } = setup();

    await submitText(result, "hello");

    expect(texts(result)).toContain("Error: boom");
  });

  it("clears history back to the welcome message via /clear", async () => {
    mockInvoke.mockResolvedValue({ text: "bonjour" });
    const { result } = setup();

    await submitText(result, "hello");
    expect(result.current.messages.length).toBeGreaterThan(1);

    await submitText(result, "/clear");
    expect(result.current.messages).toHaveLength(1);
    expect(mockInvoke).toHaveBeenCalledTimes(1); // /clear is not sent to the LLM
  });

  it("routes /from to setFromLang and never calls the LLM", async () => {
    const { result, setFromLang } = setup();

    await submitText(result, "/from german");

    expect(setFromLang).toHaveBeenCalledWith("german");
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(texts(result)).toContain("Source language changed to: german");
  });

  it("routes /to to setToLang", async () => {
    const { result, setToLang } = setup();

    await submitText(result, "/to spanish");

    expect(setToLang).toHaveBeenCalledWith("spanish");
    expect(texts(result)).toContain("Target language changed to: spanish");
  });

  it("quits on /exit", async () => {
    const { result } = setup();

    await submitText(result, "/exit");

    expect(mockExit).toHaveBeenCalledTimes(1);
  });

  it("reports an unavailable model instead of translating", async () => {
    mockCheckModel.mockResolvedValue(false);
    const { result } = setup();

    // let the mount effect resolve and flip the model-availability ref
    await waitFor(() =>
      expect(result.current.messages[0].text).toContain("is not available"),
    );

    await submitText(result, "hello");

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(texts(result).some((t) => t.includes("is not available"))).toBe(
      true,
    );
  });

  it("ignores empty input", async () => {
    const { result } = setup();

    await submitText(result, "   ");

    expect(result.current.messages).toHaveLength(1);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
