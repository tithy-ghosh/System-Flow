import type { SimEvent } from "../engine/event";
import type { NodeContext, NodeHandler } from "../engine/simulation";
import { SimRNG } from "../utils/sim-rng";

export type LBAlgorithm = "round-robin" | "random";

export interface LoadBalancerConfig {
  /** The IDs of the downstream server nodes. */
  downstreamNodeIds: string[];
  /** Routing algorithm to use. */
  algorithm: LBAlgorithm;
  /** Random number generator (only used if algorithm is 'random'). */
  rng: SimRNG;
}

interface LBState {
  /** Tracks the next index for Round Robin. */
  nextIndex: number;
}

export function createLoadBalancerNode(config: LoadBalancerConfig): NodeHandler {
  if (config.downstreamNodeIds.length === 0) {
    throw new Error("LoadBalancer must have at least one downstream node.");
  }

  const state: LBState = { nextIndex: 0 };

  return (event: SimEvent, ctx: NodeContext) => {
    if (event.type !== "ARRIVAL") return;

    // 1. Select the target server based on the algorithm.
    let targetNodeId: string;

    if (config.algorithm === "round-robin") {
      targetNodeId = config.downstreamNodeIds[state.nextIndex];
      state.nextIndex = (state.nextIndex + 1) % config.downstreamNodeIds.length;
    } else {
      // 'random'
      const randomIndex = Math.floor(config.rng.uniform() * config.downstreamNodeIds.length);
      targetNodeId = config.downstreamNodeIds[randomIndex];
    }

    // 2. Forward the ARRIVAL event to the chosen server.
    // We preserve the requestId so we can trace the request end-to-end later.
    ctx.schedule({
      time: ctx.now,
      type: "ARRIVAL",
      nodeId: targetNodeId,
      requestId: event.requestId,
      attempt: event.attempt,
    });
  };
}