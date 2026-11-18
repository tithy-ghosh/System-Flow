import type { SimEvent } from "../engine/event";
import type { NodeContext, NodeHandler } from "../engine/simulation";
import { SimRNG } from "../utils/sim-rng";

export interface ClientConfig {
  rps: number;
  targetNodeId: string;
  rng: SimRNG;
  /** Fraction of requests that are reads. Default 0.8. */
  readRatio?: number;
}

export function createClientNode(config: ClientConfig): NodeHandler {
  const meanInterArrivalMs = 1000 / config.rps;
  const readRatio = config.readRatio ?? 0.8;
  let counter = 0;

  return (event: SimEvent, ctx: NodeContext) => {
    if (event.type !== "GENERATE") return;

    const requestId = `${event.nodeId}#${counter++}`;
    const kind = config.rng.uniform() < readRatio ? "read" : "write";

    ctx.schedule({
      time: ctx.now,
      type: "ARRIVAL",
      nodeId: config.targetNodeId,
      requestId,
      attempt: 0,
      kind,
    });

    ctx.schedule({
      time: ctx.now + config.rng.exponential(meanInterArrivalMs),
      type: "GENERATE",
      nodeId: event.nodeId,
      requestId: `${requestId}:gen`,
      attempt: 0,
    });
  };
}