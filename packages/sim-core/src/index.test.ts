import { describe, it, expect } from "vitest";
import { hello, VERSION } from "./index";

describe("sim-core", () => {
  it("should return the correct greeting", () => {
    expect(hello()).toBe("sim-core is alive");
  });

  it("should have a version", () => {
    expect(VERSION).toBeDefined();
  });
});