import type { SimEvent } from "../engine/event";
import type { NodeContext, NodeHandler } from "../engine/simulation";
import { SimRNG } from "../utils/sim-rng";

export interface DatabaseConfig {
  /** Max concurrent connections (the pool). */
  poolSize: number;
  /** Mean latency for reads, ms. */
  readLatencyMs: number;
  /** Mean latency for writes, ms. Writes are heavier. */
  writeLatencyMs: number;
  /** Requests waiting for a connection before drops. */
  queueLimit: number;
  rng: SimRNG;
  onDrop?: (requestId: string) => void;
}

export interface DatabaseStats {
  reads: number;
  writes: number;
  dropped: number;
}

export type DatabaseNode = NodeHandler & { stats: () => DatabaseStats };

interface DbState {
  active: number;
  queue: SimEvent[];
  reads: number;
  writes: number;
  dropped: number;
}

export function createDatabaseNode(config: DatabaseConfig): DatabaseNode {
  const state: DbState = { active: 0, queue: [], reads: 0, writes: 0, dropped: 0 };

  const startQuery = (event: SimEvent, ctx: NodeContext) => {
    state.active++;
    const isWrite = event.kind === "write";
    if (isWrite) state.writes++;
    else state.reads++;

    const mean = isWrite ? config.writeLatencyMs : config.readLatencyMs;
    const latency = config.rng.exponential(mean);

    ctx.schedule({
      time: ctx.now + latency,
      type: "DEPARTURE",
      nodeId: event.nodeId,
      requestId: event.requestId,
      attempt: event.attempt,
      kind: event.kind,
    });
  };

  const handler: NodeHandler = (event: SimEvent, ctx: NodeContext) => {
    if (event.type === "ARRIVAL") {
      if (state.active < config.poolSize) {
        startQuery(event, ctx);
      } else if (state.queue.length < config.queueLimit) {
        state.queue.push(event);
      } else {
        state.dropped++;
        config.onDrop?.(event.requestId);
      }
    } else if (event.type === "DEPARTURE") {
      state.active--;
      if (state.queue.length > 0) {
        const next = state.queue.shift()!;
        startQuery(next, ctx);
      }
    }
  };

  return Object.assign(handler, {
    stats: (): DatabaseStats => ({
      reads: state.reads,
      writes: state.writes,
      dropped: state.dropped,
    }),
  });
}