import { describe, expect, it } from "vitest";

import { cleanText } from "./clean-text.util";

describe("cleanText", () => {
  it("returns an empty string unchanged", () => {
    expect(cleanText("")).toBe("");
  });

  it("collapses a whitespace-only string to empty", () => {
    expect(cleanText("   \t  ")).toBe("");
    expect(cleanText("\n\n\n")).toBe("");
    expect(cleanText("\n\n\n\n\n")).toBe("");
  });

  it("trims leading and trailing whitespace of the whole string", () => {
    expect(cleanText("  hello  ")).toBe("hello");
  });

  it("strips leading whitespace from each line", () => {
    expect(cleanText("a\n   b\n\tc")).toBe("a\nb\nc");
  });

  it("preserves trailing whitespace inside a line", () => {
    expect(cleanText("a  \nb")).toBe("a  \nb");
  });

  it("collapses 3+ consecutive newlines into a blank line", () => {
    expect(cleanText("a\n\n\nb")).toBe("a\n\nb");
    expect(cleanText("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("keeps a single blank line between paragraphs", () => {
    expect(cleanText("first\n\nsecond")).toBe("first\n\nsecond");
  });

  it("handles mixed content: outer trim, per-line trimStart, and collapse", () => {
    const input = "  Hello world\n\n\n\n    indented line  \n";
    expect(cleanText(input)).toBe("Hello world\n\nindented line");
  });

  it("leaves already-clean text untouched", () => {
    const clean = "line one\nline two";
    expect(cleanText(clean)).toBe(clean);
  });
});
