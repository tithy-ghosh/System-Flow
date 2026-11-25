import { describe, it, expect } from "vitest";
import { graphSchema, serverDataSchema, cacheDataSchema, simNodeDataSchema } from "./nodes";

describe("node schemas", () => {
  it("accepts a valid server config", () => {
    const res = serverDataSchema.safeParse({
      kind: "server",
      label: "App Server",
      workers: 4,
      meanServiceTime: 10,
      distribution: "lognormal",
      queueLimit: 100,
    });
    expect(res.success).toBe(true);
  });

  it("rejects zero workers with a readable message", () => {
    const res = serverDataSchema.safeParse({
      kind: "server",
      label: "x",
      workers: 0,
      meanServiceTime: 10,
      distribution: "lognormal",
      queueLimit: 100,
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].message).toContain("worker");
  });

  it("rejects hitRatio above 1", () => {
    const res = cacheDataSchema.safeParse({
      kind: "cache", label: "c", hitRatio: 1.5, hitLatencyMs: 1, missPenaltyMs: 1,
    });
    expect(res.success).toBe(false);
  });

  it("discriminated union rejects unknown kinds", () => {
    const res = simNodeDataSchema.safeParse({ kind: "cdn", label: "nope" });
    expect(res.success).toBe(false);
  });

  it("graph schema rejects edges with missing targets", () => {
    const res = graphSchema.safeParse({
      version: 1,
      nodes: [],
      edges: [{ id: "e1", source: "a", target: "" }],
    });
    expect(res.success).toBe(false);
  });
});