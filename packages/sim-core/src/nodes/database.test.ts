import { describe, it, expect } from "vitest";
import { Simulation } from "../engine/simulation";
import { createDatabaseNode } from "./database";
import type { SimRNG as SimRNGType } from "../utils/sim-rng";

const fixedRng = { uniform: () => 0.5, exponential: (m: number) => m, lognormal: (m: number) => m } as unknown as SimRNGType;

function arrival(id: string, kind: "read" | "write" = "read", time = 0) {
  return { time, type: "ARRIVAL" as const, nodeId: "db", requestId: id, attempt: 0, kind };
}

describe("Database Node", () => {
  it("charges write latency for writes and read latency for reads", () => {
    const sim = new Simulation({ endTime: 1000, captureTrace: true });
    const db = createDatabaseNode({
      poolSize: 2,
      readLatencyMs: 10,
      writeLatencyMs: 40,
      queueLimit: 10,
      rng: fixedRng,
    });
    sim.register("db", db);

    sim.schedule(arrival("read1", "read", 0));
    sim.schedule(arrival("write1", "write", 0));

    const result = sim.run();
    const departures = result.trace!.filter((e) => e.type === "DEPARTURE");

    const readDep = departures.find((e) => e.requestId === "read1")!;
    const writeDep = departures.find((e) => e.requestId === "write1")!;

    expect(readDep.time).toBe(10);
    expect(writeDep.time).toBe(40);
    expect(db.stats()).toEqual({ reads: 1, writes: 1, dropped: 0 });
  });

  it("serializes queries beyond the pool size", () => {
    const sim = new Simulation({ endTime: 1000 });
    const db = createDatabaseNode({
      poolSize: 1,
      readLatencyMs: 10,
      writeLatencyMs: 10,
      queueLimit: 10,
      rng: fixedRng,
    });
    sim.register("db", db);

    sim.schedule(arrival("a", "read", 0));
    sim.schedule(arrival("b", "read", 0));
    sim.schedule(arrival("c", "read", 0));

    const result = sim.run();
    expect(result.finalTime).toBe(30); // 10 + 10 + 10, serialized
    expect(result.eventsProcessed).toBe(6);
  });

  it("drops when the pool and queue are both full", () => {
    const dropped: string[] = [];
    const sim = new Simulation({ endTime: 1000 });
    const db = createDatabaseNode({
      poolSize: 1,
      readLatencyMs: 10,
      writeLatencyMs: 10,
      queueLimit: 1,
      rng: fixedRng,
      onDrop: (id) => dropped.push(id),
    });
    sim.register("db", db);

    sim.schedule(arrival("a", "read", 0));
    sim.schedule(arrival("b", "read", 0));
    sim.schedule(arrival("c", "read", 0)); // pool full + queue full -> drop

    const result = sim.run();
    expect(dropped).toEqual(["c"]);
    expect(db.stats().dropped).toBe(1);
    expect(result.eventsProcessed).toBe(5); // 3 arrivals + 2 departures
  });
});