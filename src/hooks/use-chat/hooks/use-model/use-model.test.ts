// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UseModelOptions } from "./use-model.type";

const {
  mockCheckModel,
  mockSetModel,
  mockSetTemp,
  mockListModels,
  mockResolveStartup,
} = vi.hoisted(() => ({
  mockCheckModel: vi.fn(),
  mockSetModel: vi.fn(),
  mockSetTemp: vi.fn(),
  mockListModels: vi.fn(),
  mockResolveStartup: vi.fn(),
}));

vi.mock("@/services/llm-model", () => ({
  llmModelService: {
    checkModelAvailable: mockCheckModel,
    setModel: mockSetModel,
    setTemperature: mockSetTemp,
    listModels: mockListModels,
    resolveStartupModel: mockResolveStartup,
    // External-store surface read via useSyncExternalStore.
    subscribe: () => () => {},
    getModel: () => "gemma4:12b-mlx",
    getTemperature: () => 0.1,
  },
}));

import { useModel } from "./use-model.hook";

function setup(overrides: Partial<UseModelOptions> = {}) {
  const addMessage = vi.fn();
  const options: UseModelOptions = { addMessage, ...overrides };
  const utils = renderHook(() => useModel(options));
  return { ...utils, addMessage };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckModel.mockResolvedValue(true);
  mockResolveStartup.mockResolvedValue({ status: "ok" });
});

describe("useModel", () => {
  it("exposes the active model and temperature from the service", () => {
    const { result } = setup();
    expect(result.current.model).toBe("gemma4:12b-mlx");
    expect(result.current.temp).toBe(0.1);
  });

  it("marks the model available on an ok startup", async () => {
    const { result } = setup();
    await waitFor(() =>
      expect(result.current.modelAvailableRef.current).toBe(true),
    );
  });

  it("falls back to an installed model when the preferred one is missing", async () => {
    mockResolveStartup.mockResolvedValue({
      status: "fallback",
      model: "llama3",
    });
    const { result, addMessage } = setup();

    await waitFor(() =>
      expect(result.current.modelAvailableRef.current).toBe(true),
    );
    expect(mockSetModel).toHaveBeenCalledWith("llama3");
    expect(addMessage).toHaveBeenCalledWith(
      "Bot",
      expect.stringContaining('switched to "llama3"'),
    );
  });

  it("blocks and reports when no models are installed", async () => {
    mockResolveStartup.mockResolvedValue({ status: "no-models" });
    const { result, addMessage } = setup();

    await waitFor(() =>
      expect(result.current.modelAvailableRef.current).toBe(false),
    );
    expect(addMessage).toHaveBeenCalledWith(
      "Bot",
      expect.stringContaining("No models are installed"),
    );
  });

  it("applyModel switches the service and re-verifies", async () => {
    const { result } = setup();
    mockCheckModel.mockClear(); // ignore the mount-time check

    await act(async () => {
      await result.current.applyModel("llama3");
    });

    expect(mockSetModel).toHaveBeenCalledWith("llama3");
    expect(mockCheckModel).toHaveBeenCalledTimes(1);
  });

  it("openModelPicker lists the installed models", async () => {
    mockListModels.mockResolvedValue(["gemma3:4b", "llama3"]);
    const { result } = setup();

    await act(async () => {
      await result.current.openModelPicker();
    });

    expect(result.current.modelItems).toEqual(["gemma3:4b", "llama3"]);
  });

  it("openModelPicker reports instead of opening an empty picker", async () => {
    mockListModels.mockResolvedValue([]);
    const { result, addMessage } = setup();

    await act(async () => {
      await result.current.openModelPicker();
    });

    expect(result.current.modelItems).toBeNull();
    expect(addMessage).toHaveBeenCalledWith(
      "Bot",
      expect.stringContaining("No models found"),
    );
  });

  it("selectModel closes the picker and applies the model", async () => {
    mockListModels.mockResolvedValue(["gemma3:4b", "llama3"]);
    const { result } = setup();

    await act(async () => {
      await result.current.openModelPicker();
    });
    await act(async () => {
      await result.current.selectModel("llama3");
    });

    expect(mockSetModel).toHaveBeenCalledWith("llama3");
    expect(result.current.modelItems).toBeNull();
  });

  it("cancelModelPicker closes the picker without applying", async () => {
    mockListModels.mockResolvedValue(["gemma3:4b"]);
    const { result } = setup();

    await act(async () => {
      await result.current.openModelPicker();
    });
    act(() => result.current.cancelModelPicker());

    expect(result.current.modelItems).toBeNull();
    expect(mockSetModel).not.toHaveBeenCalled();
  });

  it("applyTemp updates the service", async () => {
    const { result } = setup();

    act(() => result.current.applyTemp(0.7));

    expect(mockSetTemp).toHaveBeenCalledWith(0.7);
  });

  it("openTempPicker / selectTemp / cancelTempPicker drive the stepper", async () => {
    const { result } = setup();

    act(() => result.current.openTempPicker());
    expect(result.current.tempPickerOpen).toBe(true);

    act(() => result.current.selectTemp(1.2));
    expect(result.current.tempPickerOpen).toBe(false);
    expect(mockSetTemp).toHaveBeenCalledWith(1.2);

    act(() => result.current.openTempPicker());
    act(() => result.current.cancelTempPicker());
    expect(result.current.tempPickerOpen).toBe(false);
  });
});
