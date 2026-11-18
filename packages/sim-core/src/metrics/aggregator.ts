/**
 * Pre-defined buckets for latency in milliseconds.
 * Covers everything from fast cache hits (1ms) to DB timeouts (5000ms).
 */
const BUCKETS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, Infinity];

export interface MetricSnapshot {
  count: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  buckets: { le: number; count: number }[];
}

export class MetricsAggregator {
  private count = 0;
  private sum = 0;
  private min = Infinity;
  private max = -Infinity;
  private bucketCounts = new Array(BUCKETS.length).fill(0);

  record(value: number): void {
    if (!Number.isFinite(value) || value < 0) return;

    this.count++;
    this.sum += value;
    if (value < this.min) this.min = value;
    if (value > this.max) this.max = value;

    // Find the bucket this value belongs to
    for (let i = 0; i < BUCKETS.length; i++) {
      if (value <= BUCKETS[i]) {
        this.bucketCounts[i]++;
        break;
      }
    }
  }

  private percentile(p: number): number {
    if (this.count === 0) return 0;
    const target = Math.ceil(this.count * p);
    let cumulative = 0;

    for (let i = 0; i < BUCKETS.length; i++) {
      cumulative += this.bucketCounts[i];
      if (cumulative >= target) {
        return BUCKETS[i];
      }
    }
    return BUCKETS[BUCKETS.length - 1];
  }

  snapshot(): MetricSnapshot {
    const mean = this.count > 0 ? this.sum / this.count : 0;
    
    return {
      count: this.count,
      min: this.count > 0 ? this.min : 0,
      max: this.count > 0 ? this.max : 0,
      mean,
      p50: this.percentile(0.50),
      p95: this.percentile(0.95),
      p99: this.percentile(0.99),
      buckets: BUCKETS.map((le, i) => ({ le, count: this.bucketCounts[i] })),
    };
  }

  reset(): void {
    this.count = 0;
    this.sum = 0;
    this.min = Infinity;
    this.max = -Infinity;
    this.bucketCounts.fill(0);
  }
}