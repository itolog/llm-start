// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UseChatOptions } from "./use-chat.type";

// Shared mocks, hoisted so the vi.mock factories below can close over them.
const { mockExit, mockTranslate, mockCheckModel, mockSetModel, mockSetTemp } =
  vi.hoisted(() => ({
    mockExit: vi.fn(),
    mockTranslate: vi.fn(),
    mockCheckModel: vi.fn(),
    mockSetModel: vi.fn(),
    mockSetTemp: vi.fn(),
  }));

vi.mock("ink", () => ({ useApp: () => ({ exit: mockExit }) }));
// The service encapsulates the chain, timeout, retry and cleaning; the hook
// only orchestrates messages, so we mock the service surface directly.
vi.mock("@/services/llm-model", () => ({
  llmModelService: {
    translate: mockTranslate,
    checkModelAvailable: mockCheckModel,
    setModel: mockSetModel,
    setTemperature: mockSetTemp,
  },
}));

import { useChat } from "./use-chat.hook";

function setup(overrides: Partial<UseChatOptions> = {}) {
  const setFromLang = vi.fn();
  const setToLang = vi.fn();
  const setModel = vi.fn();
  const setTemp = vi.fn();
  const options: UseChatOptions = {
    fromLang: "english",
    toLang: "polish",
    setFromLang,
    setToLang,
    setModel,
    setTemp,
    ...overrides,
  };
  const utils = renderHook(() => useChat(options));
  return { ...utils, setFromLang, setToLang, setModel, setTemp };
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

  it("translates: adds the user line and the bot reply", async () => {
    mockTranslate.mockResolvedValue("bonjour");
    const { result } = setup();

    await submitText(result, "hello");

    expect(mockTranslate).toHaveBeenCalledTimes(1);
    expect(mockTranslate).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "hello",
        fromLang: "english",
        toLang: "polish",
        signal: expect.anything(),
      }),
    );
    expect(texts(result)).toContain("hello");
    expect(texts(result)).toContain("bonjour");
    expect(result.current.isLoading).toBe(false);
  });

  it("shows a neutral message when the request is aborted", async () => {
    const abortError = Object.assign(new Error("aborted"), {
      name: "AbortError",
    });
    mockTranslate.mockRejectedValue(abortError);
    const { result } = setup();

    await submitText(result, "hello");

    expect(texts(result)).toContain("Request cancelled");
  });

  it("surfaces a generic error as an Error message", async () => {
    mockTranslate.mockRejectedValue(new Error("boom"));
    const { result } = setup();

    await submitText(result, "hello");

    expect(texts(result)).toContain("Error: boom");
  });

  it("clears history back to the welcome message via /clear", async () => {
    mockTranslate.mockResolvedValue("bonjour");
    const { result } = setup();

    await submitText(result, "hello");
    expect(result.current.messages.length).toBeGreaterThan(1);

    await submitText(result, "/clear");
    expect(result.current.messages).toHaveLength(1);
    expect(mockTranslate).toHaveBeenCalledTimes(1); // /clear is not sent to the LLM
  });

  it("routes /from to setFromLang and never calls the LLM", async () => {
    const { result, setFromLang } = setup();

    await submitText(result, "/from german");

    expect(setFromLang).toHaveBeenCalledWith("german");
    expect(mockTranslate).not.toHaveBeenCalled();
    expect(texts(result)).toContain("Source language changed to: german");
  });

  it("routes /to to setToLang", async () => {
    const { result, setToLang } = setup();

    await submitText(result, "/to spanish");

    expect(setToLang).toHaveBeenCalledWith("spanish");
    expect(texts(result)).toContain("Target language changed to: spanish");
  });

  it("routes /model to the service, state, and re-checks availability", async () => {
    const { result, setModel } = setup();
    mockCheckModel.mockClear(); // ignore the mount-time check

    await submitText(result, "/model llama3");

    expect(mockSetModel).toHaveBeenCalledWith("llama3");
    expect(setModel).toHaveBeenCalledWith("llama3");
    expect(mockCheckModel).toHaveBeenCalledTimes(1); // re-verified after switch
    expect(mockTranslate).not.toHaveBeenCalled();
    expect(texts(result)).toContain("Model changed to: llama3");
  });

  it("routes /temp to the service and state", async () => {
    const { result, setTemp } = setup();

    await submitText(result, "/temp 0.7");

    expect(mockSetTemp).toHaveBeenCalledWith(0.7);
    expect(setTemp).toHaveBeenCalledWith(0.7);
    expect(mockTranslate).not.toHaveBeenCalled();
    expect(texts(result)).toContain("Temperature changed to: 0.7");
  });

  it("quits on /exit", async () => {
    const { result } = setup();

    await submitText(result, "/exit");

    expect(mockExit).toHaveBeenCalledTimes(1);
  });

  it("reports an unavailable model instead of translating", async () => {
    mockCheckModel.mockResolvedValue(false);
    const { result } = setup();

    // let the mount effect resolve and flip the model-availability ref;
    // the error is appended after the welcome message, not replacing it
    await waitFor(() =>
      expect(texts(result).some((t) => t.includes("is not available"))).toBe(
        true,
      ),
    );
    expect(result.current.messages[0].text).toContain("Hello! I am a TUI");

    await submitText(result, "hello");

    expect(mockTranslate).not.toHaveBeenCalled();
    expect(texts(result).some((t) => t.includes("is not available"))).toBe(
      true,
    );
  });

  it("ignores empty input", async () => {
    const { result } = setup();

    await submitText(result, "   ");

    expect(result.current.messages).toHaveLength(1);
    expect(mockTranslate).not.toHaveBeenCalled();
  });
});
