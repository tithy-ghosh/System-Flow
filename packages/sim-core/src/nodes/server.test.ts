import { describe, it, expect } from "vitest";
import { Simulation } from "../engine/simulation";
import { createServerNode } from "./server";
import type { SimRNG } from "../utils/sim-rng";

describe("Server Node", () => {
  it("processes a single request", () => {
    const sim = new Simulation({ endTime: 1000, captureTrace: true });

    // Mock RNG that always returns a fixed service time of 6.93ms
    const mockRng = {
      uniform: () => 0.5,
      exponential: () => 6.93,
      lognormal: () => 6.93,
    } as unknown as SimRNG;

    sim.register(
      "server",
      createServerNode({
        workers: 1,
        medianServiceTime: 10,
        serviceTimeShape: 0.5,
        queueLimit: 10,
        rng: mockRng,
        distribution: "lognormal",
        meanServiceTime: 10,
      }),
    );

    sim.schedule({
      time: 0,
      type: "ARRIVAL",
      nodeId: "server",
      requestId: "r1",
      attempt: 0,
    });

    const result = sim.run();
    expect(result.eventsProcessed).toBe(2); // 1 arrival + 1 departure
    expect(result.finalTime).toBeCloseTo(6.93, 1);
  });

  it("queues requests when workers are busy", () => {
    const sim = new Simulation({ endTime: 1000, captureTrace: true });
    const mockRng = {
      uniform: () => 0.5,
      exponential: () => 6.93,
      lognormal: () => 6.93,
    } as unknown as SimRNG;

    sim.register(
      "server",
      createServerNode({
        workers: 1,
        medianServiceTime: 10,
        serviceTimeShape: 0.5,
        queueLimit: 10,
        rng: mockRng,
        distribution: "lognormal",
        meanServiceTime: 10,
      }),
    );

    // Send 3 requests at t=0
    for (let i = 0; i < 3; i++) {
      sim.schedule({
        time: 0,
        type: "ARRIVAL",
        nodeId: "server",
        requestId: `r${i}`,
        attempt: 0,
      });
    }

    const result = sim.run();
    expect(result.eventsProcessed).toBe(6); // 3 arrivals + 3 departures
    expect(result.finalTime).toBeGreaterThan(20);
  });

  it("drops requests when queue is full", () => {
    const sim = new Simulation({ endTime: 1000 });
    const mockRng = {
      uniform: () => 0.5,
      exponential: () => 69.3,
      lognormal: () => 69.3,
    } as unknown as SimRNG;

    sim.register(
      "server",
      createServerNode({
        workers: 1,
        medianServiceTime: 100,
        serviceTimeShape: 0.5,
        queueLimit: 2,
        rng: mockRng,
        distribution: "lognormal",
        meanServiceTime: 10,
      }),
    );

    // Send 5 requests at t=0. 1 starts, 2 queue, 2 must drop.
    for (let i = 0; i < 5; i++) {
      sim.schedule({
        time: 0,
        type: "ARRIVAL",
        nodeId: "server",
        requestId: `r${i}`,
        attempt: 0,
      });
    }

    const result = sim.run();
    expect(result.eventsProcessed).toBe(8); // 5 arrivals + 3 departures
  });
});
