import type { SimEvent } from "../engine/event";
import type { NodeContext, NodeHandler } from "../engine/simulation";
import { SimRNG } from "../utils/sim-rng";

export interface ServerConfig {
  workers: number;
  medianServiceTime: number;
  serviceTimeShape: number;
  queueLimit: number;
  rng: SimRNG;
}

interface ServerState {
  activeWorkers: number;
  queue: SimEvent[];
  droppedCount: number;
}

export function createServerNode(config: ServerConfig): NodeHandler {
  const state: ServerState = {
    activeWorkers: 0,
    queue: [],
    droppedCount: 0,
  };

  return (event: SimEvent, ctx: NodeContext) => {
    if (event.type === "ARRIVAL") {
      // 1. If a worker is free, start processing immediately
      if (state.activeWorkers < config.workers) {
        state.activeWorkers++;
        const serviceTime = config.rng.lognormal(config.medianServiceTime, config.serviceTimeShape);
        
        ctx.schedule({
          time: ctx.now + serviceTime,
          type: "DEPARTURE",
          nodeId: event.nodeId,
          requestId: event.requestId,
          attempt: event.attempt,
        });
      } 
      // 2. If busy but queue has space, wait in line
      else if (state.queue.length < config.queueLimit) {
        state.queue.push(event);
      } 
      // 3. If queue is full, DROP the request
      else {
        state.droppedCount++;
      }
    } 
    // 4. Handle the completion of a request
    else if (event.type === "DEPARTURE") {
      state.activeWorkers--;

      // If someone is waiting in the queue, start them immediately
      if (state.queue.length > 0) {
        const nextEvent = state.queue.shift()!;
        state.activeWorkers++;
        const serviceTime = config.rng.lognormal(config.medianServiceTime, config.serviceTimeShape);
        
        ctx.schedule({
          time: ctx.now + serviceTime,
          type: "DEPARTURE",
          nodeId: nextEvent.nodeId,
          requestId: nextEvent.requestId,
          attempt: nextEvent.attempt,
        });
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