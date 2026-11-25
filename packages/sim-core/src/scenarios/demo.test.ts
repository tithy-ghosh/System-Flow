import { describe, it, expect } from "vitest";
import { runDemoSimulation } from "./demo";
import type { SimulationResultDTO } from "@repo/schemas";

const strip = (r: SimulationResultDTO) => ({ ...r, durationMs: 0 });

describe("demo scenario", () => {
  it("is byte-identical across runs (ignoring wall-clock)", () => {
    const a = runDemoSimulation();
    const b = runDemoSimulation();
    expect(strip(a)).toEqual(strip(b));
  });

  it("produces sane metrics", () => {
    const r = runDemoSimulation();
    expect(r.stopReason).toBe("horizon");
    expect(r.eventsProcessed).toBeGreaterThan(10_000);
    expect(r.latency.count).toBeGreaterThan(5_000);
    expect(r.latency.mean).toBeGreaterThan(0);
    expect(r.cacheHits).toBeGreaterThan(r.cacheMisses);
  });
});