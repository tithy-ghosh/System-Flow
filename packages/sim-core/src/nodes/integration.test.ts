import { describe, it, expect } from "vitest";
import { Simulation } from "../engine/simulation";
import { createClientNode } from "./client";
import { createLoadBalancerNode } from "./load-balancer";
import { createServerNode } from "./server";
import { createRNG } from "../utils/rng";

describe("End-to-End Pipeline", () => {
  it("routes traffic from Client -> LB -> Servers and processes them", () => {
    const sim = new Simulation({ endTime: 1000 }); // 1 second simulation
    const rng = createRNG(123);

    // --- 1. Setup Nodes ---
    
    // Client: 10 RPS (1 request every 100ms on average)
    sim.register("client", createClientNode({
      rps: 10,
      targetNodeId: "lb",
      random: rng,
    }));

    // Load Balancer: Round Robin to 2 servers
    sim.register("lb", createLoadBalancerNode({
      downstreamNodeIds: ["server-1", "server-2"],
      algorithm: "round-robin",
      random: rng,
    }));

    // Servers: 1 worker each, fast service time (5ms)
    const serverConfig = { workers: 1, meanServiceTime: 5, queueLimit: 10, random: rng };
    sim.register("server-1", createServerNode(serverConfig));
    sim.register("server-2", createServerNode(serverConfig));

    // --- 2. Seed the simulation ---
    // Kick off the first GENERATE event for the client at t=0.
    sim.schedule({
      time: 0,
      type: "GENERATE",
      nodeId: "client",
      requestId: "seed-1",
      attempt: 0,
    });

    // --- 3. Run ---
    const result = sim.run();

    // --- 4. Assertions ---
    // In 1000ms at 10 RPS, we expect roughly 10 requests.
    // Each request generates: 1 GENERATE + 1 ARRIVAL(LB) + 1 ARRIVAL(Server) + 1 DEPARTURE(Server) = 4 events.
    // 10 requests * 4 events = ~40 events. (Plus the initial seed).
    expect(result.eventsProcessed).toBeGreaterThan(30);
    expect(result.eventsProcessed).toBeLessThan(60); // Allow for Poisson variance

    // Verify Round Robin distribution by checking the trace (if we enabled it)
    // For now, we just ensure it didn't crash and processed events.
    expect(result.stopReason).toBe("horizon");
  });

  it("Load Balancer distributes evenly with Round Robin", () => {
    const sim = new Simulation({ endTime: 100 });
    const rng = createRNG(42);

    // Track arrivals at each server
    const arrivals: Record<string, number> = { "s1": 0, "s2": 0 };

    sim.register("lb", createLoadBalancerNode({
      downstreamNodeIds: ["s1", "s2"],
      algorithm: "round-robin",
      random: rng,
    }));

    // Dummy servers that just count arrivals
    sim.register("s1", () => { arrivals["s1"]++; });
    sim.register("s2", () => { arrivals["s2"]++; });

    // Manually send 4 arrivals to the LB
    for (let i = 0; i < 4; i++) {
      sim.schedule({
        time: i * 10,
        type: "ARRIVAL",
        nodeId: "lb",
        requestId: `r${i}`,
        attempt: 0,
      });
    }

    sim.run();

    // Round robin should split 4 requests exactly 2 and 2.
    expect(arrivals["s1"]).toBe(2);
    expect(arrivals["s2"]).toBe(2);
  });
});