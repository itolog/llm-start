import { describe, expect, it } from "vitest";

import { Command } from "@/utils/parse-command";

import { getCommandCategory } from "./command-category.util";

describe("getCommandCategory", () => {
  it("classifies a plain text submit as translate", () => {
    expect(getCommandCategory({ type: "translate", text: "hello" })).toBe(
      "translate",
    );
  });

  it.each<Command>([
    { type: "model", model: "llama3" },
    { type: "temp", temp: 0.7 },
  ])("classifies $type as chain-affecting", (command) => {
    expect(getCommandCategory(command)).toBe("chain-affecting");
  });

  it.each<Command>([
    { type: "from", lang: "english" },
    { type: "to", lang: "polish" },
    { type: "models" },
    { type: "tempPicker" },
    { type: "clear" },
    { type: "help" },
    { type: "exit" },
    { type: "error", message: "boom" },
  ])("classifies $type as pure", (command) => {
    expect(getCommandCategory(command)).toBe("pure");
  });
});
