import type { EventInput, SimEvent } from "../engine/event";
import type { NodeContext, NodeHandler } from "../engine/simulation";

export interface ServerConfig {
 /** Number of concurrent workers */
  workers: number;
 /** Mean service time in ms */
  meanServiceTime: number; 
  /** Max requests waiting in queue. 0 means no queue(drop if busy) */
  queueLimit: number;
  /** Random number generator for service limit */
  random: () => number;
}

interface ServerState {
  activeWorkers: number;
  queue: SimEvent[];
  droppedCount: number;
}

function sampleExponential(mean: number, random: () => number): number {
  // Inverse transform sampling for exponential distribution
  return -mean * Math.log(1 - random());
}

/**
 * Creates a handler for a generic server node (App Server, DB, etc.).
 * Models an M/M/c queue with a finite buffer.
 */
export function createServerNode(config: ServerConfig): NodeHandler {
  const state: ServerState = {
    activeWorkers: 0,
    queue: [],
    droppedCount: 0,
  };

  return (event: SimEvent, ctx: NodeContext) => {
    if (event.type === "ARRIVAL") {
      handleArrival(event, ctx, state, config);
    } else if (event.type === "DEPARTURE") {
      handleDeparture(ctx, state, config);
    }
  };
}

function handleArrival(
  event: SimEvent,
  ctx: NodeContext,
  state: ServerState,
  config: ServerConfig
): void {
  if (state.activeWorkers < config.workers) {
    // Start processing
    state.activeWorkers++;
    const serviceTime = sampleExponential(config.meanServiceTime, config.random);
    ctx.schedule({
      time: ctx.now + serviceTime,
      type: "DEPARTURE",
      nodeId: event.nodeId,
      requestId: event.requestId,
      attempt: event.attempt,
    });
  } else if (state.queue.length < config.queueLimit) {
    // Wait in line
    state.queue.push(event);
  } else {
    // Drop
    state.droppedCount++;
  }
}

function handleDeparture(
  ctx: NodeContext,
  state: ServerState,
  config: ServerConfig
): void {
  state.activeWorkers--;

  // If there's someone waiting, start them immediately
  if (state.queue.length > 0) {
    const nextEvent = state.queue.shift()!;
    state.activeWorkers++;
    const serviceTime = sampleExponential(config.meanServiceTime, config.random);
    ctx.schedule({
      time: ctx.now + serviceTime,
      type: "DEPARTURE",
      nodeId: nextEvent.nodeId,
      requestId: nextEvent.requestId,
      attempt: nextEvent.attempt,
    });
  }
}

// Expose state for metrics (read-only)
export function getServerMetrics(state: ServerState) {
  return {
    activeWorkers: state.activeWorkers,
    queueDepth: state.queue.length,
    dropped: state.droppedCount,
  };
}