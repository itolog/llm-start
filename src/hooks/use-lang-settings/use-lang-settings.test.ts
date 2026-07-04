// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useLangSettings } from "./use-lang-settings.hook";

describe("useLangSettings", () => {
  it("starts with english → polish defaults", () => {
    const { result } = renderHook(() => useLangSettings());
    expect(result.current.fromLang).toBe("english");
    expect(result.current.toLang).toBe("polish");
  });

  it("updates the source language via setFromLang", () => {
    const { result } = renderHook(() => useLangSettings());
    act(() => result.current.setFromLang("german"));
    expect(result.current.fromLang).toBe("german");
    expect(result.current.toLang).toBe("polish");
  });

  it("updates the target language via setToLang", () => {
    const { result } = renderHook(() => useLangSettings());
    act(() => result.current.setToLang("spanish"));
    expect(result.current.toLang).toBe("spanish");
    expect(result.current.fromLang).toBe("english");
  });
});
