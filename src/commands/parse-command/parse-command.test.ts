import { describe, expect, it } from "vitest";

import { parseCommand } from "./parse-command.util";

describe("parseCommand", () => {
  describe("translate", () => {
    it("returns translate for plain text", () => {
      expect(parseCommand("hello world")).toEqual({
        type: "translate",
        text: "hello world",
      });
    });

    it("trims surrounding whitespace", () => {
      expect(parseCommand("  hello  ")).toEqual({
        type: "translate",
        text: "hello",
      });
    });

    it("returns translate for empty string (no leading slash)", () => {
      expect(parseCommand("")).toEqual({ type: "translate", text: "" });
    });
  });

  describe("/from", () => {
    it("parses a valid /from command", () => {
      expect(parseCommand("/from russian")).toEqual({
        type: "from",
        lang: "russian",
      });
    });

    it("is case-insensitive on the prefix", () => {
      expect(parseCommand("/FROM russian")).toEqual({
        type: "from",
        lang: "russian",
      });
      expect(parseCommand("/From russian")).toEqual({
        type: "from",
        lang: "russian",
      });
    });

    it("uses slice, not replace — handles nested prefix correctly", () => {
      expect(parseCommand("/from /from russian")).toEqual({
        type: "from",
        lang: "/from russian",
      });
    });

    it("preserves original casing of the language", () => {
      expect(parseCommand("/from English")).toEqual({
        type: "from",
        lang: "English",
      });
    });

    it("returns error for empty argument after prefix", () => {
      const result = parseCommand("/from ");
      expect(result.type).toBe("error");
      if (result.type === "error") {
        expect(result.message).toMatch(/from/);
      }
    });

    it("returns error for /from with no space", () => {
      const result = parseCommand("/from");
      expect(result.type).toBe("error");
    });
  });

  describe("/to", () => {
    it("parses a valid /to command", () => {
      expect(parseCommand("/to english")).toEqual({
        type: "to",
        lang: "english",
      });
    });

    it("is case-insensitive on the prefix", () => {
      expect(parseCommand("/TO english")).toEqual({
        type: "to",
        lang: "english",
      });
    });

    it("uses slice, not replace — handles nested prefix correctly", () => {
      expect(parseCommand("/to /to english")).toEqual({
        type: "to",
        lang: "/to english",
      });
    });

    it("returns error for empty argument after prefix", () => {
      const result = parseCommand("/to ");
      expect(result.type).toBe("error");
    });

    it("returns error for /to with no space", () => {
      const result = parseCommand("/to");
      expect(result.type).toBe("error");
    });
  });

  describe("/model", () => {
    it("parses a valid /model command", () => {
      expect(parseCommand("/model llama3")).toEqual({
        type: "model",
        model: "llama3",
      });
    });

    it("is case-insensitive on the prefix, preserves the model casing", () => {
      expect(parseCommand("/MODEL Gemma3:4B")).toEqual({
        type: "model",
        model: "Gemma3:4B",
      });
    });

    it("opens the model picker for bare /model", () => {
      expect(parseCommand("/model")).toEqual({ type: "models" });
    });

    it("opens the picker for /model with only trailing space (no argument)", () => {
      expect(parseCommand("/model ")).toEqual({ type: "models" });
    });

    it("is case-insensitive for the bare picker command", () => {
      expect(parseCommand("/MODEL")).toEqual({ type: "models" });
    });
  });

  describe("/temp", () => {
    it("parses a valid /temp command", () => {
      expect(parseCommand("/temp 0.7")).toEqual({ type: "temp", temp: 0.7 });
    });

    it("accepts the boundary values 0 and 2", () => {
      expect(parseCommand("/temp 0")).toEqual({ type: "temp", temp: 0 });
      expect(parseCommand("/temp 2")).toEqual({ type: "temp", temp: 2 });
    });

    it("is case-insensitive on the prefix", () => {
      expect(parseCommand("/TEMP 1")).toEqual({ type: "temp", temp: 1 });
    });

    it("returns error for a non-numeric argument", () => {
      const result = parseCommand("/temp hot");
      expect(result.type).toBe("error");
      if (result.type === "error") {
        expect(result.message).toMatch(/temp/);
      }
    });

    it("returns error for out-of-range values", () => {
      expect(parseCommand("/temp -0.1").type).toBe("error");
      expect(parseCommand("/temp 2.1").type).toBe("error");
    });

    it("returns error for /temp with no space", () => {
      expect(parseCommand("/temp").type).toBe("error");
    });
  });

  describe("/clear", () => {
    it("returns clear command", () => {
      expect(parseCommand("/clear")).toEqual({ type: "clear" });
    });

    it("is case-insensitive", () => {
      expect(parseCommand("/CLEAR")).toEqual({ type: "clear" });
    });
  });

  describe("/help", () => {
    it("returns help command", () => {
      expect(parseCommand("/help")).toEqual({ type: "help" });
    });

    it("is case-insensitive", () => {
      expect(parseCommand("/HELP")).toEqual({ type: "help" });
    });
  });

  describe("/exit, /quit and /q", () => {
    it("returns exit for /exit", () => {
      expect(parseCommand("/exit")).toEqual({ type: "exit" });
    });

    it("returns exit for /quit", () => {
      expect(parseCommand("/quit")).toEqual({ type: "exit" });
    });

    it("returns exit for /q", () => {
      expect(parseCommand("/q")).toEqual({ type: "exit" });
    });

    it("is case-insensitive", () => {
      expect(parseCommand("/EXIT")).toEqual({ type: "exit" });
      expect(parseCommand("/QUIT")).toEqual({ type: "exit" });
      expect(parseCommand("/Q")).toEqual({ type: "exit" });
    });
  });

  describe("unknown commands", () => {
    it("returns error for an unknown slash command", () => {
      const result = parseCommand("/foobar baz");
      expect(result.type).toBe("error");
      if (result.type === "error") {
        expect(result.message).toContain("/foobar");
      }
    });
  });

  describe("priority of parsing", () => {
    it("does not match /from inside a translate sentence", () => {
      expect(parseCommand("say /from russian")).toEqual({
        type: "translate",
        text: "say /from russian",
      });
    });
  });
});
