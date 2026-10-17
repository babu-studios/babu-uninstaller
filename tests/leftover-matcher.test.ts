import { describe, expect, it } from "vitest";
import { matchLeftover } from "../electron/leftover-matcher";

describe("matchLeftover", () => {
  it("selects only an exact bundle ID", () => {
    expect(matchLeftover("/Library/Caches/com.example.editor", "Editor", "com.example.editor"))
      .toEqual({ matched: true, confidence: "high", selected: true });
    expect(matchLeftover("/Library/Caches/not-com.example.editor", "Editor", "com.example.editor").matched).toBe(false);
  });

  it("does not select an exact app-name match automatically", () => {
    expect(matchLeftover("/Library/Logs/Canvas Pro", "Canvas Pro", "com.example.canvas"))
      .toEqual({ matched: true, confidence: "medium", selected: false });
  });

  it("rejects empty bundle IDs and short/common names as selections", () => {
    expect(matchLeftover("/Library/Caches/Mail", "Mail", "")).toEqual({
      matched: true, confidence: "low", selected: false
    });
    expect(matchLeftover("/Library/Caches/Zoom", "Zoom", "")).toMatchObject({ confidence: "low", selected: false });
    expect(matchLeftover("/Library/Caches/Zoom Extra", "Zoom", "").matched).toBe(false);
  });

  it("matches a plist only after removing its extension", () => {
    expect(matchLeftover("/Library/Preferences/com.example.editor.plist", "Editor", "com.example.editor").selected).toBe(true);
  });
});
