import { describe, it, expect } from "vitest";
import { Simulation } from "../engine/simulation";
import { SimRNG } from "../utils/sim-rng";
import { createClientNode } from "./client";
import { createLoadBalancerNode } from "./load-balancer";
import { createServerNode } from "./server";

describe("End-to-End Pipeline", () => {
  it("routes traffic from Client -> LB -> Servers and processes them", () => {
    const sim = new Simulation({ endTime: 1000 }); // 1 second simulation
    const rng = new SimRNG(123);

    sim.register("client", createClientNode({
      rps: 10,
      targetNodeId: "lb",
      rng,
    }));

    sim.register("lb", createLoadBalancerNode({
      downstreamNodeIds: ["server-1", "server-2"],
      algorithm: "round-robin",
      rng,
    }));

    const serverConfig = { 
      workers: 1, 
      medianServiceTime: 5, 
      serviceTimeShape: 0.5, 
      queueLimit: 10, 
      rng,
      distribution: "lognormal",
      meanServiceTime: 5,
    } as const;
    sim.register("server-1", createServerNode(serverConfig));
    sim.register("server-2", createServerNode(serverConfig));

    sim.schedule({
      time: 0,
      type: "GENERATE",
      nodeId: "client",
      requestId: "seed-1",
      attempt: 0,
    });

    const result = sim.run();

    // With 10 RPS over 1000ms, we expect ~8-12 requests due to Poisson variance.
    // Each request generates 4 events: GENERATE -> ARRIVAL(LB) -> ARRIVAL(Server) -> DEPARTURE(Server)
    // 8 requests * 4 = 32 events minimum.
    expect(result.eventsProcessed).toBeGreaterThanOrEqual(32);
    expect(result.stopReason).toBe("horizon");
  });

  it("Load Balancer distributes evenly with Round Robin", () => {
    const sim = new Simulation({ endTime: 100 });
    const rng = new SimRNG(42);

    const arrivals: Record<string, number> = { "s1": 0, "s2": 0 };

    sim.register("lb", createLoadBalancerNode({
      downstreamNodeIds: ["s1", "s2"],
      algorithm: "round-robin",
      rng,
    }));

    sim.register("s1", () => { arrivals["s1"]++; });
    sim.register("s2", () => { arrivals["s2"]++; });

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

    expect(arrivals["s1"]).toBe(2);
    expect(arrivals["s2"]).toBe(2);
  });
});