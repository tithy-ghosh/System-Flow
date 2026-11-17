/**
 * Mulberry32 PRNG.
 * A fast, deterministic 32-bit seeded random number generator.
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller transform to generate a standard normal variate (mean=0, std=1)
 * from two uniform random numbers.
 */
function boxMuller(u1: number, u2: number): number {
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

export class SimRNG {
  private nextUniform: () => number;

  constructor(seed: number) {
    this.nextUniform = mulberry32(seed);
  }

  /** Returns a uniform random number between 0 (inclusive) and 1 (exclusive). */
  uniform(): number {
    return this.nextUniform();
  }

  /** 
   * Exponential distribution. 
   * Used for inter-arrival times (Poisson process).
   * @param mean The average value.
   */
  exponential(mean: number): number {
    return -mean * Math.log(1 - this.nextUniform());
  }

  /** 
   * Lognormal distribution. 
   * Used for service times to model realistic latency spikes (fat right tail).
   * @param median The median value (e.g., p50 latency).
   * @param shape The shape parameter (sigma). Higher = fatter tail/more variance.
   *             0.5 is typical for API calls, 1.0+ for databases.
   */
  lognormal(median: number, shape: number): number {
    const u1 = this.nextUniform();
    const u2 = this.nextUniform();
    const z = boxMuller(u1, u2);
    // Convert median to mu (log-space mean)
    const mu = Math.log(median);
    return Math.exp(mu + shape * z);
  }
}