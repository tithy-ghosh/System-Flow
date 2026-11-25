import { Simulation } from "../engine/simulation";
import { SimRNG } from "../utils/sim-rng";
import { createClientNode } from "../nodes/client";
import { createCacheNode } from "../nodes/cache";
import { createDatabaseNode } from "../nodes/database";
import { RequestLatencyTracker } from "../metrics/request-tracker";
import type { SimulationResultDTO } from "@repo/schemas";

/**
 * Fixed demo topology: Client -> Cache -> Database.
 * 60 simulated seconds at 200 RPS (~12k requests).
 * Fully deterministic: same seeds every run.
 */
export function runDemoSimulation(): SimulationResultDTO {
  const startedAt = performance.now();
  const tracker = new RequestLatencyTracker();

  const sim = new Simulation({
    endTime: 60_000,
    onEvent: (event, time) => tracker.observe(event, time),
  });

  const cache = createCacheNode({
    hitRatio: 0.8,
    hitLatencyMs: 1,
    missPenaltyMs: 1,
    downstreamNodeId: "db",
    rng: new SimRNG(102),
  });

  const db = createDatabaseNode({
    poolSize: 8,
    readLatencyMs: 20,
    writeLatencyMs: 40,
    queueLimit: 2000,
    rng: new SimRNG(103),
  });

  sim.register("client", createClientNode({ rps: 200, targetNodeId: "cache", rng: new SimRNG(101), readRatio: 0.8 }));
  sim.register("cache", cache);
  sim.register("db", db);

  sim.schedule({ time: 0, type: "GENERATE", nodeId: "client", requestId: "seed", attempt: 0 });
  const res = sim.run();

  const cacheStats = cache.stats();
  const dbStats = db.stats();

  return {
    stopReason: res.stopReason,
    eventsProcessed: res.eventsProcessed,
    finalTime: res.finalTime,
    durationMs: performance.now() - startedAt,
    latency: tracker.snapshot(),
    dropped: dbStats.dropped,
    dbQueries: dbStats.reads + dbStats.writes,
    cacheHits: cacheStats.hits,
    cacheMisses: cacheStats.misses,
  };
}