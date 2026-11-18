import { describe, it, expect } from "vitest";
import { Simulation } from "../engine/simulation";
import { SimRNG } from "../utils/sim-rng";
import { createClientNode } from "./client";
import { createCacheNode } from "./cache";
import { createDatabaseNode } from "./database";
import { RequestLatencyTracker } from "../metrics/request-tracker";

function runScenario(withCache: boolean) {
  const tracker = new RequestLatencyTracker();
  const sim = new Simulation({
    endTime: 20_000,
    onEvent: (event, time) => tracker.observe(event, time),
  });

  sim.register("client", createClientNode({
    rps: 50,
    targetNodeId: withCache ? "cache" : "db",
    rng: new SimRNG(42),
    readRatio: 0.8,
  }));

  if (withCache) {
    sim.register("cache", createCacheNode({
      hitRatio: 0.8,
      hitLatencyMs: 1,
      missPenaltyMs: 1,
      downstreamNodeId: "db",
      rng: new SimRNG(43),
    }));
  }

  const db = createDatabaseNode({
    poolSize: 8,
    readLatencyMs: 20,
    writeLatencyMs: 40,
    queueLimit: 1000,
    rng: new SimRNG(44),
  });
  sim.register("db", db);

  sim.schedule({ time: 0, type: "GENERATE", nodeId: "client", requestId: "seed", attempt: 0 });
  const result = sim.run();

  return { result, tracker, db };
}

describe("Cache + Database end-to-end", () => {
  it("adding a cache dramatically reduces mean latency", () => {
    const without = runScenario(false);
    const withC = runScenario(true);

    const withoutMean = without.tracker.snapshot().mean;
    const withMean = withC.tracker.snapshot().mean;

    console.log(`\n🗄️  No cache:  mean=${withoutMean.toFixed(1)}ms p95=${without.tracker.snapshot().p95}ms dbQueries=${without.db.stats().reads + without.db.stats().writes}`);
    console.log(`⚡ With cache: mean=${withMean.toFixed(1)}ms p95=${withC.tracker.snapshot().p95}ms dbQueries=${withC.db.stats().reads + withC.db.stats().writes}\n`);

    expect(without.tracker.completedCount).toBeGreaterThan(500);
    expect(withC.tracker.completedCount).toBeGreaterThan(500);

    // 80% of reads served in 1ms instead of ~20-40ms
    expect(withMean).toBeLessThan(withoutMean * 0.5);

    // The cache absorbs ~64% of DB traffic (80% hits on 80% reads)
    const queriesWithout = without.db.stats().reads + without.db.stats().writes;
    const queriesWith = withC.db.stats().reads + withC.db.stats().writes;
    expect(queriesWith).toBeLessThan(queriesWithout * 0.5);
  });

  it("observer sees events in non-decreasing time order", () => {
    const times: number[] = [];
    const sim = new Simulation({
      endTime: 2000,
      onEvent: (_e, t) => times.push(t),
    });
    sim.register("client", createClientNode({ rps: 20, targetNodeId: "db", rng: new SimRNG(9) }));
    sim.register("db", createDatabaseNode({ poolSize: 2, readLatencyMs: 5, writeLatencyMs: 10, queueLimit: 100, rng: new SimRNG(10) }));
    sim.schedule({ time: 0, type: "GENERATE", nodeId: "client", requestId: "seed", attempt: 0 });
    sim.run();

    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
  });
});