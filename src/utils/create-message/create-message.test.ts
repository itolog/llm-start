import { describe, expect, it } from "vitest";

import { createMessage } from "./create-message.util";

describe("createMessage", () => {
  it("passes role and text through unchanged", () => {
    const msg = createMessage("You", "hello");
    expect(msg.role).toBe("You");
    expect(msg.text).toBe("hello");
  });

  it("supports the Bot role", () => {
    const msg = createMessage("Bot", "translated");
    expect(msg.role).toBe("Bot");
    expect(msg.text).toBe("translated");
  });

  it("assigns a non-empty string id", () => {
    const msg = createMessage("You", "hi");
    expect(typeof msg.id).toBe("string");
    expect(msg.id.length).toBeGreaterThan(0);
  });

  it("generates a unique id per call", () => {
    const ids = Array.from({ length: 100 }, () => createMessage("You", "x").id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preserves an empty text value", () => {
    const msg = createMessage("Bot", "");
    expect(msg.text).toBe("");
  });
});
