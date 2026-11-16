export type EventType =
  "ARRIVAL" | "DEPARTURE" | "RETRY" | "FAILURE" | "METRICS_TICK";

export interface SimEvent {
  /**
   * Absolute simulated time in milliseconds.
   */
  time: number;
  /**
   * Deterministic tie-breaker  
   * If two events have the same time, the lower seq is processed first.
   * The EventQueue assigns this automatically.
   */
  seq: number;
  type: EventType;
  /**
   * The node that should handle this event.
   * Example: "client-1", "server-1", "db-1".
   */
  nodeId: string;
  /**
   * Unique request ID used to trace one request across multiple nodes.
   * Example: "req-000001".
   */
  requestId: string;
  /**
   * Retry attempt count
   */
  attempt: number;

  /**
   * Optional extra data.
   * Later this can hold read/write type, error reason, cache hit status, etc.
   */
  payload?: Record<string, unknown>;
}
export type EventInput = Omit<SimEvent, "seq">;