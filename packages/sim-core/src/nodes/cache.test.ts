import { describe, it, expect } from "vitest";
import { Simulation } from "../engine/simulation";
import { createCacheNode } from "./cache";
import { SimRNG } from "../utils/sim-rng";
import type { SimRNG as SimRNGType } from "../utils/sim-rng";

const alwaysHit = { uniform: () => 0, exponential: (m: number) => m, lognormal: (m: number) => m } as unknown as SimRNGType;
const alwaysMiss = { uniform: () => 0.999, exponential: (m: number) => m, lognormal: (m: number) => m } as unknown as SimRNGType;

function arrival(id: string, time = 0) {
  return { time, type: "ARRIVAL" as const, nodeId: "cache", requestId: id, attempt: 0 };
}

describe("Cache Node", () => {
  it("serves hits locally and never touches downstream", () => {
    const sim = new Simulation({ endTime: 1000 });
    let downstreamArrivals = 0;

    const cache = createCacheNode({
      hitRatio: 1,
      hitLatencyMs: 2,
      missPenaltyMs: 1,
      downstreamNodeId: "db",
      rng: alwaysHit,
    });

    sim.register("cache", cache);
    sim.register("db", () => { downstreamArrivals++; });

    sim.schedule(arrival("r1"));
    const result = sim.run();

    expect(result.eventsProcessed).toBe(2); // arrival + departure at cache
    expect(result.finalTime).toBe(2);
    expect(downstreamArrivals).toBe(0);
    expect(cache.stats().hits).toBe(1);
  });

  it("forwards misses to downstream after the lookup penalty", () => {
    const sim = new Simulation({ endTime: 1000 });
    let downstreamArrivals = 0;
    let downstreamTime = -1;

    const cache = createCacheNode({
      hitRatio: 0,
      hitLatencyMs: 2,
      missPenaltyMs: 1,
      downstreamNodeId: "db",
      rng: alwaysMiss,
    });

    sim.register("cache", cache);
    sim.register("db", (_e, ctx) => {
      downstreamArrivals++;
      downstreamTime = ctx.now;
    });

    sim.schedule(arrival("r1"));
    sim.run();

    expect(downstreamArrivals).toBe(1);
    expect(downstreamTime).toBe(1); // missPenaltyMs
    expect(cache.stats().misses).toBe(1);
  });

  it("observed hit ratio converges to configured ratio", () => {
    const sim = new Simulation({ endTime: 1000 });
    const cache = createCacheNode({
      hitRatio: 0.7,
      hitLatencyMs: 1,
      missPenaltyMs: 1,
      rng: new SimRNG(7),
    });

    sim.register("cache", cache);
    sim.register("sink", () => {}); // misses forward nowhere -> but no downstream configured, completes locally

    for (let i = 0; i < 2000; i++) {
      sim.schedule(arrival(`r${i}`, i * 0.1));
    }
    sim.run();

    const stats = cache.stats();
    expect(stats.hits + stats.misses).toBe(2000);
    expect(stats.observedHitRatio).toBeGreaterThan(0.65);
    expect(stats.observedHitRatio).toBeLessThan(0.75);
  });
});