import React from "react";

import { Text } from "ink";
import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./error-boundary.component";

// A component that throws on render to trip the boundary.
const Boom = () => {
  throw new Error("kaboom");
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    const { lastFrame } = render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(Text, null, "all good"),
      ),
    );

    expect(lastFrame()).toContain("all good");
  });

  it("renders a fallback card with the error message when a child throws", () => {
    // React logs the caught error to console.error; silence it for a clean run.
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { lastFrame } = render(
      React.createElement(ErrorBoundary, null, React.createElement(Boom)),
    );

    const frame = lastFrame() ?? "";
    expect(frame).toContain("Something went wrong");
    expect(frame).toContain("kaboom");
  });
});
