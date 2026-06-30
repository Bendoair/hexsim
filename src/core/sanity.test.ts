import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../config/SimConfig";

describe("scaffold sanity", () => {
  it("loads the default config headlessly (no Babylon, no DOM)", () => {
    expect(DEFAULT_CONFIG.seed).toBe(1);
    expect(DEFAULT_CONFIG.terrain.grass).toBeGreaterThan(0);
  });
});
