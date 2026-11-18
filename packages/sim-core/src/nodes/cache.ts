import type { SimEvent } from "../engine/event";
import type { NodeContext, NodeHandler } from "../engine/simulation";
import { SimRNG } from "../utils/sim-rng";

export interface CacheConfig {
  /** Probability a read is served from cache (0..1). */
  hitRatio: number;
  /** Latency to serve a hit, ms. Typically 1-2ms. */
  hitLatencyMs: number;
  /** Lookup overhead before forwarding a miss, ms. */
  missPenaltyMs: number;
  /** Where misses go. If omitted, misses complete locally. */
  downstreamNodeId?: string;
  /** Latency of a local miss completion (only if no downstream). */
  missLatencyMs?: number;
  rng: SimRNG;
}

export interface CacheStats {
  hits: number;
  misses: number;
  observedHitRatio: number;
}

export type CacheNode = NodeHandler & { stats: () => CacheStats };

export function createCacheNode(config: CacheConfig): CacheNode {
  let hits = 0;
  let misses = 0;

  const handler: NodeHandler = (event: SimEvent, ctx: NodeContext) => {
    if (event.type !== "ARRIVAL") return;

    const isHit = config.rng.uniform() < config.hitRatio;

    if (isHit) {
      hits++;
      // Serve from cache: request completes HERE, never touching the DB.
      ctx.schedule({
        time: ctx.now + config.hitLatencyMs,
        type: "DEPARTURE",
        nodeId: event.nodeId,
        requestId: event.requestId,
        attempt: event.attempt,
        kind: event.kind,
      });
    } else {
      misses++;
      if (config.downstreamNodeId) {
        // Forward to the DB after paying the lookup penalty.
        ctx.schedule({
          time: ctx.now + config.missPenaltyMs,
          type: "ARRIVAL",
          nodeId: config.downstreamNodeId,
          requestId: event.requestId,
          attempt: event.attempt,
          kind: event.kind,
        });
      } else {
        ctx.schedule({
          time: ctx.now + (config.missLatencyMs ?? config.hitLatencyMs),
          type: "DEPARTURE",
          nodeId: event.nodeId,
          requestId: event.requestId,
          attempt: event.attempt,
          kind: event.kind,
        });
      }
    }
  };

  return Object.assign(handler, {
    stats: (): CacheStats => ({
      hits,
      misses,
      observedHitRatio: hits + misses > 0 ? hits / (hits + misses) : 0,
    }),
  });
}