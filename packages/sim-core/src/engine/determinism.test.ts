import { describe, it, expect } from "vitest";
import { Simulation } from "./simulation";
import { SimRNG } from "../utils/sim-rng";
import { createClientNode } from "../nodes/client";
import { createLoadBalancerNode } from "../nodes/load-balancer";
import { createServerNode } from "../nodes/server";

describe("Determinism & Reproducibility", () => {
  it("produces byte-identical traces across multiple runs with the same seed", () => {
    const runSimulation = (seed: number) => {
      const sim = new Simulation({ endTime: 1000, captureTrace: true });
      const rng = new SimRNG(seed);

      sim.register(
        "client",
        createClientNode({ rps: 50, targetNodeId: "lb", rng }),
      );
      sim.register(
        "lb",
        createLoadBalancerNode({
          downstreamNodeIds: ["s1", "s2"],
          algorithm: "random",
          rng,
        }),
      );

      const serverConfig = {
        workers: 2,
        medianServiceTime: 10,
        serviceTimeShape: 0.8,
        queueLimit: 50,
        rng,
        distribution: "lognormal",
        meanServiceTime: 10,
      } as const;
      sim.register("s1", createServerNode(serverConfig));
      sim.register("s2", createServerNode(serverConfig));

      sim.schedule({
        time: 0,
        type: "GENERATE",
        nodeId: "client",
        requestId: "seed",
        attempt: 0,
      });
      return sim.run();
    };

    const run1 = runSimulation(12345);
    const run2 = runSimulation(12345); // Same seed
    const run3 = runSimulation(99999); // Different seed

    // 1. Same seed = Identical results
    expect(run1.eventsProcessed).toBe(run2.eventsProcessed);
    expect(run1.finalTime).toBe(run2.finalTime);
    expect(run1.trace).toEqual(run2.trace); // Deep equality check

    // 2. Different seed = Different results (almost certainly)
    expect(run1.trace).not.toEqual(run3.trace);
  });
});
