import type { EventInput, SimEvent } from "../engine/event";
import type { NodeContext, NodeHandler } from "../engine/simulation";

export interface ClientConfig {
  /** Target Requests Per Second. */
  rps: number;
  /** The ID of the node to send requests to (e.g., a Load Balancer or Server). */
  targetNodeId: string;
  /** Random number generator for inter-arrival times. */
  random: () => number;
}

/**
 * Generates a Poisson stream of ARRIVAL events.
 * 
 * Instead of scheduling all events at t=0 (which would consume massive memory),
 * it uses a "self-scheduling" pattern: every time it generates a request,
 * it schedules the next one.
 */
export function createClientNode(config: ClientConfig): NodeHandler {
  // Calculate the mean inter-arrival time in milliseconds.
  // 100 RPS = 1000ms / 100 = 10ms average between requests.
  const meanInterArrivalMs = 1000 / config.rps;

  return (event: SimEvent, ctx: NodeContext) => {
    // We only care about GENERATE events. 
    // (The initial GENERATE event is seeded by the test/setup).
    if (event.type !== "GENERATE") return;

    // 1. Schedule the actual ARRIVAL event at the target node.
    // We schedule it for the CURRENT time (ctx.now) so it enters the target's queue immediately.
    ctx.schedule({
      time: ctx.now,
      type: "ARRIVAL",
      nodeId: config.targetNodeId,
      requestId: event.requestId,
      attempt: 0,
    });

    // 2. Calculate the time until the NEXT request (Exponential distribution).
    const nextInterArrival = -meanInterArrivalMs * Math.log(1 - config.random());

    // 3. Schedule the next GENERATE event for ourselves.
    ctx.schedule({
      time: ctx.now + nextInterArrival,
      type: "GENERATE",
      nodeId: event.nodeId, // Send back to this same client node
      requestId: `gen-${event.requestId.split('-')[1] || '0'}-${ctx.now}`, 
      attempt: 0,
    });
  };
}