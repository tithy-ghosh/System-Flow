import { EventQueue } from "./event-queue";
import type { EventInput, SimEvent } from "./event";



export class SimulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationError";
  }
}

/** A node tried to schedule an event before the current virtual time. */
export class PastSchedulingError extends SimulationError {
  constructor(time: number, now: number) {
    super(
      `Cannot schedule an event in the past: time=${time} < now=${now}. ` +
        `Causality violation — check the node's delay calculation.`
    );
    this.name = "PastSchedulingError";
  }
}

/** The event budget was exhausted — almost always an infinite retry loop. */
export class EventCapExceededError extends SimulationError {
  constructor(cap: number, now: number) {
    super(
      `Event cap exceeded (${cap} events) at t=${now}ms. ` +
        `Likely a zero-delay retry loop. Check maxRetries and backoff.`
    );
    this.name = "EventCapExceededError";
  }
}

/** An event targeted a node that was never registered. */
export class UnknownNodeError extends SimulationError {
  constructor(nodeId: string) {
    super(
      `No handler registered for node "${nodeId}". ` +
        `Check that every edge target exists in the graph.`
    );
    this.name = "UnknownNodeError";
  }
}



export type StopReason = "drained" | "horizon";

/**
 * What a node handler is allowed to do.
 * Deliberately narrow: nodes cannot touch the queue directly, so every
 * scheduled event passes through the engine's validation.
 */
export interface NodeContext {
  
  readonly now: number;

  schedule(event: EventInput): SimEvent;
}

export type NodeHandler = (event: SimEvent, ctx: NodeContext) => void;

export interface SimulationOptions {
  
  endTime: number;
  
  maxEvents?: number;
 
  captureTrace?: boolean;
}

export interface SimulationResult {
  stopReason: StopReason;
  eventsProcessed: number;
  finalTime: number;
  endTime: number;
 
  remainingEvents: number;
  trace?: SimEvent[];
}



export class Simulation {
  private readonly queue = new EventQueue();
  private readonly handlers = new Map<string, NodeHandler>();

  private clock = 0;
  private processed = 0;
  private running = false;

  private readonly endTime: number;
  private readonly maxEvents: number;
  private readonly captureTrace: boolean;
  private trace: SimEvent[] | undefined;

  /**
   * Reused across the whole run (no per-event allocation).
   * `now` is mutable internally but exposed as readonly via NodeContext.
   */
  private readonly ctx: {
    now: number;
    schedule: (e: EventInput) => SimEvent;
  } = {
    now: 0,
    schedule: (e: EventInput) => this.schedule(e),
  };

  constructor(options: SimulationOptions) {
    if (!Number.isFinite(options.endTime) || options.endTime <= 0) {
      throw new SimulationError("endTime must be a finite number > 0");
    }
    const cap = options.maxEvents ?? 5_000_000;
    if (!Number.isFinite(cap) || cap < 1) {
      throw new SimulationError("maxEvents must be a finite number >= 1");
    }

    this.endTime = options.endTime;
    this.maxEvents = cap;
    this.captureTrace = options.captureTrace ?? false;
    if (this.captureTrace) this.trace = [];
  }

  

  get now(): number {
    return this.clock;
  }

  get eventsProcessed(): number {
    return this.processed;
  }

  get pending(): number {
    return this.queue.size;
  }

  

  register(nodeId: string, handler: NodeHandler): void {
    if (this.running) {
      throw new SimulationError("Cannot register a node during a run");
    }
    this.handlers.set(nodeId, handler);
  }

  unregister(nodeId: string): void {
    if (this.running) {
      throw new SimulationError("Cannot unregister a node during a run");
    }
    this.handlers.delete(nodeId);
  }

  has(nodeId: string): boolean {
    return this.handlers.has(nodeId);
  }



  /**
   * The single entry point for ALL events — initial seeding and node-generated.
   * Every event is validated here, which is why nodes get a narrow context
   * instead of raw queue access.
   */
  schedule(event: EventInput): SimEvent {
    if (!Number.isFinite(event.time)) {
      throw new SimulationError(
        `Event time must be finite, got ${event.time} (node "${event.nodeId}"). ` +
          `NaN silently corrupts heap ordering.`
      );
    }
    if (event.time < this.clock) {
      throw new PastSchedulingError(event.time, this.clock);
    }
    return this.queue.push(event);
  }

  /** Clear run state but KEEP the node registry (the model is unchanged). */
  reset(): void {
    this.queue.clear();
    this.clock = 0;
    this.processed = 0;
    this.ctx.now = 0;
    if (this.captureTrace) this.trace = [];
  }


  run(): SimulationResult {
    if (this.running) {
      throw new SimulationError("Simulation is already running");
    }
    this.running = true;

    try {
      while (!this.queue.isEmpty) {
        // Peek first (O(1)) so a past-horizon event stays counted as remaining.
        const next = this.queue.peek()!;
        if (next.time > this.endTime) {
          return this.result("horizon");
        }

        const event = this.queue.pop()!;

        // Defense in depth: the heap guarantees this, so a violation means
        // heap corruption or a mutated event.time.
        if (event.time < this.clock) {
          throw new SimulationError(
            `Clock regression: popped t=${event.time} after clock=${this.clock}. ` +
              `Heap invariant violated.`
          );
        }

        // Advance the virtual clock. Time jumps — nothing happens between events.
        this.clock = event.time;
        this.ctx.now = event.time;

        this.processed++;
        if (this.processed > this.maxEvents) {
          throw new EventCapExceededError(this.maxEvents, this.clock);
        }

        const handler = this.handlers.get(event.nodeId);
        if (!handler) {
          throw new UnknownNodeError(event.nodeId);
        }

        if (this.trace) this.trace.push(event);

        handler(event, this.ctx);
      }

      return this.result("drained");
    } finally {
      this.running = false;
    }
  }

  private result(stopReason: StopReason): SimulationResult {
    return {
      stopReason,
      eventsProcessed: this.processed,
      finalTime: this.clock,
      endTime: this.endTime,
      remainingEvents: this.queue.size,
      trace: this.trace,
    };
  }
}