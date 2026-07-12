import { describe, expect, it } from "vitest";

import { COMMANDS } from "@/components/commands-help";

import { suggestCommands } from "./suggest-commands.util";

describe("suggestCommands", () => {
  it("returns all commands for a bare slash", () => {
    expect(suggestCommands("/")).toEqual(COMMANDS);
  });

  it("narrows to a single command by prefix", () => {
    expect(suggestCommands("/te").map((c) => c.name)).toEqual(["/temp"]);
  });

  it("keeps every command sharing the prefix", () => {
    expect(suggestCommands("/t").map((c) => c.name)).toEqual(["/to", "/temp"]);
  });

  it("matches case-insensitively", () => {
    expect(suggestCommands("/TE").map((c) => c.name)).toEqual(["/temp"]);
  });

  it("still matches an exactly typed command", () => {
    expect(suggestCommands("/temp").map((c) => c.name)).toEqual(["/temp"]);
  });

  it("returns nothing once a space is typed (argument stage)", () => {
    expect(suggestCommands("/temp ")).toEqual([]);
    expect(suggestCommands("/from eng")).toEqual([]);
  });

  it("returns nothing for non-slash input", () => {
    expect(suggestCommands("")).toEqual([]);
    expect(suggestCommands("hello")).toEqual([]);
    expect(suggestCommands("temp")).toEqual([]);
  });

  it("returns nothing for an unknown command prefix", () => {
    expect(suggestCommands("/x")).toEqual([]);
  });
});
