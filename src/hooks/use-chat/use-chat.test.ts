// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UseChatOptions } from "./use-chat.type";

// Shared mocks, hoisted so the vi.mock factories below can close over them.
const {
  mockExit,
  mockTranslate,
  mockCheckModel,
  mockSetModel,
  mockSetTemp,
  mockListModels,
} = vi.hoisted(() => ({
  mockExit: vi.fn(),
  mockTranslate: vi.fn(),
  mockCheckModel: vi.fn(),
  mockSetModel: vi.fn(),
  mockSetTemp: vi.fn(),
  mockListModels: vi.fn(),
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
    listModels: mockListModels,
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

const fakeStats = {
  elapsedMs: 100,
  promptTokens: 1,
  completionTokens: 2,
  totalTokens: 3,
  tokensPerSecond: 20,
};

// The service now returns { text, stats }; helper to build that shape.
const translationResult = (text: string) => ({ text, stats: fakeStats });

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
    mockTranslate.mockResolvedValue(translationResult("bonjour"));
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

  it("fills the bot message in live as tokens stream", async () => {
    mockTranslate.mockImplementation(
      async ({ onToken }: { onToken?: (partial: string) => void }) => {
        onToken?.("Bon");
        onToken?.("Bonjour");
        return translationResult("Bonjour");
      },
    );
    const { result } = setup();

    await submitText(result, "hello");

    // one You line + one Bot line (updated in place, not appended per token)
    expect(
      result.current.messages.filter((m) => m.role === "Bot"),
    ).toHaveLength(
      2, // welcome + the streamed reply
    );
    expect(texts(result)).toContain("Bonjour");
  });

  it("exposes the translation stats after a successful translation", async () => {
    mockTranslate.mockResolvedValue(translationResult("bonjour"));
    const { result } = setup();

    expect(result.current.stats).toBeNull();

    await submitText(result, "hello");

    expect(result.current.stats).toMatchObject(fakeStats);
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
    mockTranslate.mockResolvedValue(translationResult("bonjour"));
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

  it("opens the model picker on bare /model, then applies a selection", async () => {
    mockListModels.mockResolvedValue(["gemma3:4b", "llama3"]);
    const { result, setModel } = setup();
    mockCheckModel.mockClear(); // ignore the mount-time check

    await submitText(result, "/model");

    expect(mockListModels).toHaveBeenCalledTimes(1);
    expect(result.current.modelItems).toEqual(["gemma3:4b", "llama3"]);
    expect(mockSetModel).not.toHaveBeenCalled(); // nothing applied yet

    await act(async () => {
      await result.current.selectModel("llama3");
    });

    expect(mockSetModel).toHaveBeenCalledWith("llama3");
    expect(setModel).toHaveBeenCalledWith("llama3");
    expect(mockCheckModel).toHaveBeenCalledTimes(1); // re-verified after switch
    expect(result.current.modelItems).toBeNull(); // picker closed
    expect(texts(result)).toContain("Model changed to: llama3");
  });

  it("cancelModelPicker closes the picker without applying a model", async () => {
    mockListModels.mockResolvedValue(["gemma3:4b"]);
    const { result } = setup();

    await submitText(result, "/model");
    expect(result.current.modelItems).toEqual(["gemma3:4b"]);

    act(() => result.current.cancelModelPicker());

    expect(result.current.modelItems).toBeNull();
    expect(mockSetModel).not.toHaveBeenCalled();
  });

  it("reports when no models are installed instead of opening the picker", async () => {
    mockListModels.mockResolvedValue([]);
    const { result } = setup();

    await submitText(result, "/model");

    expect(result.current.modelItems).toBeNull();
    expect(texts(result).some((t) => t.includes("No models found"))).toBe(true);
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
