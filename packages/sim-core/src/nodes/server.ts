import type { SimEvent } from "../engine/event";
import type { NodeContext, NodeHandler } from "../engine/simulation";
import { SimRNG } from "../utils/sim-rng";

export type ServiceDistribution = "exponential" | "lognormal";

export interface ServerConfig {
  workers: number;
  queueLimit: number;
  rng: SimRNG;
  
  // Distribution config
  distribution: ServiceDistribution;
  meanServiceTime: number;   // Used if exponential
  medianServiceTime?: number; // Used if lognormal
  serviceTimeShape?: number;  // Used if lognormal

  // Metric callback
  onMetric?: (latencyMs: number) => void;
}

interface ServerState {
  activeWorkers: number;
  queue: SimEvent[];
  droppedCount: number;
  inFlight: Map<string, number>; // requestId -> arrivalTime
}

function sampleServiceTime(config: ServerConfig): number {
  if (config.distribution === "exponential") {
    return config.rng.exponential(config.meanServiceTime);
  } else {
    return config.rng.lognormal(
      config.medianServiceTime ?? config.meanServiceTime,
      config.serviceTimeShape ?? 0.5
    );
  }
}

export function createServerNode(config: ServerConfig): NodeHandler {
  const state: ServerState = {
    activeWorkers: 0,
    queue: [],
    droppedCount: 0,
    inFlight: new Map(),
  };

  const startProcessing = (event: SimEvent, ctx: NodeContext) => {
    state.activeWorkers++;
    const serviceTime = sampleServiceTime(config);
    ctx.schedule({
      time: ctx.now + serviceTime,
      type: "DEPARTURE",
      nodeId: event.nodeId,
      requestId: event.requestId,
      attempt: event.attempt,
    });
  };

  return (event: SimEvent, ctx: NodeContext) => {
    if (event.type === "ARRIVAL") {
      // Record arrival time
      state.inFlight.set(event.requestId, ctx.now);

      if (state.activeWorkers < config.workers) {
        startProcessing(event, ctx);
      } else if (state.queue.length < config.queueLimit) {
        state.queue.push(event);
      } else {
        // DROP: Clean up inFlight map so it doesn't leak memory
        state.inFlight.delete(event.requestId);
        state.droppedCount++;
        if (config.onMetric) config.onMetric(-1); // -1 signals a drop
      }
    } 
    else if (event.type === "DEPARTURE") {
      state.activeWorkers--;

      // Calculate and record latency
      const arrivalTime = state.inFlight.get(event.requestId);
      if (arrivalTime !== undefined) {
        const latency = ctx.now - arrivalTime;
        state.inFlight.delete(event.requestId);
        if (config.onMetric) config.onMetric(latency);
      }

      // Start next in queue
      if (state.queue.length > 0) {
        const nextEvent = state.queue.shift()!;
        startProcessing(nextEvent, ctx);
      }
    }
  };
}

export function getServerMetrics(state: ServerState) {
  return {
    activeWorkers: state.activeWorkers,
    queueDepth: state.queue.length,
    dropped: state.droppedCount,
  };
}