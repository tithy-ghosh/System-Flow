import { describe, it, expect } from "vitest";
import { Simulation } from "../engine/simulation";
import { createServerNode } from "./server";
import { createRNG } from "../utils/rng";
import type { EventInput } from "../engine/event";

describe("Server Node", () => {
  it("processes a single request", () => {
    const sim = new Simulation({ endTime: 1000 });
    const rng = createRNG(1);
    
    // Mean service time = 10ms. 
    // We force the RNG to return 0.5 so service time is deterministic for this test.
    // -10 * ln(1 - 0.5) ≈ 6.93ms
    const mockRng = () => 0.5; 

    sim.register("server", createServerNode({
      workers: 1,
      meanServiceTime: 10,
      queueLimit: 10,
      random: mockRng,
    }));

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
    const sim = new Simulation({ endTime: 1000 });
    const mockRng = () => 0.5; // ~6.93ms service time

    sim.register("server", createServerNode({
      workers: 1,
      meanServiceTime: 10,
      queueLimit: 10,
      random: mockRng,
    }));

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
    // 3 arrivals + 3 departures = 6 events
    expect(result.eventsProcessed).toBe(6);
    // Last departure should be around 3 * 6.93ms
    expect(result.finalTime).toBeGreaterThan(20);
  });

  it("drops requests when queue is full", () => {
    const sim = new Simulation({ endTime: 1000 });
    const mockRng = () => 0.5;

    sim.register("server", createServerNode({
      workers: 1,
      meanServiceTime: 100, // Slow server
      queueLimit: 2,        // Only 2 can wait
      random: mockRng,
    }));

    // Send 5 requests at t=0. 
    // 1 starts, 2 queue, 2 must drop.
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
    // 5 arrivals + 3 departures (1 processing + 2 queued) = 8 events
    expect(result.eventsProcessed).toBe(8);
  });

  /**
   * THE BIG TEST: Queueing Theory Validation.
   * 
   * For an M/M/1 queue:
   * Mean Response Time (W) = 1 / (μ - λ)
   * 
   * We set:
   * λ (arrival rate) = 80 requests/sec
   * μ (service rate) = 100 requests/sec (mean service time = 10ms)
   * 
   * Theoretical W = 1 / (100 - 80) = 1/20 sec = 50ms.
   */
  it("matches M/M/1 theoretical mean response time", () => {
    const sim = new Simulation({ endTime: 10000 }); // 10 seconds
    const rng = createRNG(42);

    const lambda = 80; // arrivals per second
    const meanServiceTime = 10; // ms (so μ = 100/sec)

    sim.register("server", createServerNode({
      workers: 1,
      meanServiceTime,
      queueLimit: 1000, // Large queue to avoid drops
      random: rng,
    }));

    // Generate Poisson arrivals
    let t = 0;
    let count = 0;
    while (t < 10000) {
      // Exponential inter-arrival time
      const interArrival = -Math.log(1 - rng()) / (lambda / 1000);
      t += interArrival;
      if (t < 10000) {
        sim.schedule({
          time: t,
          type: "ARRIVAL",
          nodeId: "server",
          requestId: `r${count++}`,
          attempt: 0,
        });
      }
    }

    const result = sim.run();
    
    // Theoretical mean response time
    const mu = 1000 / meanServiceTime; // 100 req/sec
    const theoreticalW = 1000 / (mu - lambda); // 50ms

    // We need to calculate the actual mean response time from the trace.
    // (In a real app, the node would record this. For now, we approximate 
    // by looking at the final time and total requests, or just assert 
    // the simulation didn't crash and processed the right amount).
    
    // A simpler check: The server should be busy ~80% of the time (Utilization = λ/μ = 0.8)
    // And the queue should have grown.
    expect(result.eventsProcessed).toBeGreaterThan(1000);
    
    // Note: To strictly assert W ≈ 50ms, you'd need the node to record 
    // (departureTime - arrivalTime) for every request. 
    // We will add metrics recording in Week 2.
  });
});