import type { SimEvent } from "../engine/event";
import { MetricsAggregator, type MetricSnapshot } from "./aggregator";

/**
 * Measures end-to-end request latency across any number of hops.
 * t0 = first ARRIVAL for a requestId. Latency = first DEPARTURE - t0.
 * O(in-flight) memory only.
 */
export class RequestLatencyTracker {
  private starts = new Map<string, number>();
  private latencies = new MetricsAggregator();
  private completed = 0;

  observe(event: SimEvent, time: number): void {
    if (event.type === "ARRIVAL") {
      if (!this.starts.has(event.requestId)) {
        this.starts.set(event.requestId, time);
      }
    } else if (event.type === "DEPARTURE") {
      const t0 = this.starts.get(event.requestId);
      if (t0 !== undefined) {
        this.starts.delete(event.requestId);
        this.latencies.record(time - t0);
        this.completed++;
      }
    }
  }

  get inFlight(): number {
    return this.starts.size;
  }

  get completedCount(): number {
    return this.completed;
  }

  snapshot(): MetricSnapshot {
    return this.latencies.snapshot();
  }
}