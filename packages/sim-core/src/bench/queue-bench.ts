/**
 * EventQueue benchmark + allocation diagnostic.
 *
 * Run:  pnpm --filter @repo/sim-core bench
 *
 * Optional (cleaner GC isolation):
 *   NODE_OPTIONS="--expose-gc --max-old-space-size=4096" pnpm --filter @repo/sim-core bench
 *
 * Measures raw Node performance — no test-runner overhead.
 * This same file can run on the server for Week 5 challenge verification.
 */

import { EventQueue } from "../engine/event-queue";
import type { EventInput, SimEvent } from "../engine/event";

// ---------------------------------------------------------------- PRNG + data

/** Mulberry32 — seeded so every run uses identical input. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pre-generated OUTSIDE the timed region so RNG cost isn't measured. */
function makeTimes(n: number): Float64Array {
  const rand = mulberry32(7);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = rand() * 100_000;
  return out;
}

/** Realistic event: unique trace ID per request (1M unique strings at n=1M). */
function ev(time: number, i: number): EventInput {
  return { time, type: "ARRIVAL", nodeId: "n1", requestId: `r${i}`, attempt: 0 };
}

/** Control event: one interned string, zero per-event string allocation. */
function evConst(time: number): EventInput {
  return { time, type: "ARRIVAL", nodeId: "n1", requestId: "r", attempt: 0 };
}

/** Force GC if Node was started with --expose-gc. Otherwise a no-op. */
function tryGC(): void {
  const g = globalThis as { gc?: () => void };
  if (typeof g.gc === "function") g.gc();
}

function heapMB(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

// ------------------------------------------------------- naive reference queue

/** Deliberately dumb: full sort on every extraction. Correct by construction. */
class NaiveQueue {
  private items: SimEvent[] = [];
  private counter = 0;

  push(input: EventInput): void {
    this.items.push({ ...input, seq: this.counter++ });
  }

  pop(): SimEvent | undefined {
    if (this.items.length === 0) return undefined;
    this.items.sort((a, b) => a.time - b.time || a.seq - b.seq);
    return this.items.shift();
  }

  get size(): number {
    return this.items.length;
  }
}

// ------------------------------------------------------------------ workloads

function heapWorkload(times: Float64Array): void {
  const q = new EventQueue();
  for (let i = 0; i < times.length; i++) q.push(ev(times[i], i));

  let count = 0;
  let prev = -Infinity;
  while (!q.isEmpty) {
    const e = q.pop()!;
    if (e.time < prev) throw new Error("out of order!");
    prev = e.time;
    count++;
  }
  if (count !== times.length) throw new Error("lost events!");
}

function naiveWorkload(times: Float64Array): void {
  const q = new NaiveQueue();
  for (let i = 0; i < times.length; i++) q.push(ev(times[i], i));
  while (q.size > 0) q.pop();
}

type SplitResult = {
  n: number;
  uniqueIds: boolean;
  pushMs: number;
  drainMs: number;
  totalMs: number;
  heapMB: number;
};

/**
 * Times push and drain SEPARATELY.
 * Drain allocates nothing — so if drain also degrades with n,
 * the cause is cache locality, not allocation.
 */
function splitWorkload(times: Float64Array, uniqueIds: boolean): SplitResult {
  tryGC();
  const q = new EventQueue();

  const t0 = performance.now();
  for (let i = 0; i < times.length; i++) {
    q.push(uniqueIds ? ev(times[i], i) : evConst(times[i]));
  }
  const pushMs = performance.now() - t0;
  const mem = heapMB();

  const t1 = performance.now();
  let count = 0;
  let prev = -Infinity;
  while (!q.isEmpty) {
    const e = q.pop()!;
    if (e.time < prev) throw new Error("out of order!");
    prev = e.time;
    count++;
  }
  const drainMs = performance.now() - t1;

  if (count !== times.length) throw new Error("lost events!");

  return {
    n: times.length,
    uniqueIds,
    pushMs,
    drainMs,
    totalMs: pushMs + drainMs,
    heapMB: mem,
  };
}

// -------------------------------------------------------------- report helpers

type Row = { label: string; n: number; ms: number };
const rows: Row[] = [];

function run(label: string, n: number, fn: () => void): void {
  tryGC();
  const start = performance.now();
  fn();
  const ms = performance.now() - start;
  rows.push({ label, n, ms });

  const perOp = (ms * 1e6) / (n * 2); // n pushes + n pops
  console.log(
    `${label.padEnd(24)}${String(n).padStart(9)}${ms.toFixed(0).padStart(9)} ms` +
      `${perOp.toFixed(0).padStart(9)} ns/op`
  );
}

function find(label: string, n: number): Row {
  const r = rows.find((x) => x.label === label && x.n === n);
  if (!r) throw new Error(`missing result: ${label} @ ${n}`);
  return r;
}

const LINE = "=".repeat(66);
const THIN = "-".repeat(66);

// ------------------------------------------------------------------------ main

console.log(`\n${LINE}`);
console.log("EventQueue benchmark");
console.log(LINE);

const t10k = makeTimes(10_000);
const t100k = makeTimes(100_000);
const t1m = makeTimes(1_000_000);
const t2k = makeTimes(2_000);
const t5k = makeTimes(5_000);

// Warm up the JIT so the first measured run isn't penalised.
heapWorkload(t10k);
naiveWorkload(t2k);
tryGC();

console.log("workload                        n     total       per-op");
console.log(THIN);
run("heap", 100_000, () => heapWorkload(t100k));
run("heap", 1_000_000, () => heapWorkload(t1m));
console.log(THIN);
run("naive (sort per pop)", 2_000, () => naiveWorkload(t2k));
run("naive (sort per pop)", 5_000, () => naiveWorkload(t5k));
console.log(LINE);

// ---- Section 2: allocation diagnostic -------------------------------------

console.log("\nAllocation diagnostic (push vs drain, unique vs constant IDs)");
console.log(THIN);
console.log("       n   ids        push     drain     total    heap");
console.log(THIN);

const splits: SplitResult[] = [
  splitWorkload(t100k, true),
  splitWorkload(t100k, false),
  splitWorkload(t1m, true),
  splitWorkload(t1m, false),
];

for (const s of splits) {
  console.log(
    `${String(s.n).padStart(8)}   ${(s.uniqueIds ? "unique" : "const ").padEnd(8)}` +
      `${s.pushMs.toFixed(0).padStart(7)} ms` +
      `${s.drainMs.toFixed(0).padStart(7)} ms` +
      `${s.totalMs.toFixed(0).padStart(7)} ms` +
      `${s.heapMB.toFixed(0).padStart(7)} MB`
  );
}
console.log(THIN);

const s100u = splits[0];
const s100c = splits[1];
const s1mu = splits[2];
const s1mc = splits[3];

// ---- Section 3: growth analysis -------------------------------------------

const heap100 = find("heap", 100_000);
const heap1m = find("heap", 1_000_000);
const naive2 = find("naive (sort per pop)", 2_000);
const naive5 = find("naive (sort per pop)", 5_000);

const predicted = 10 * (Math.log2(1_000_000) / Math.log2(100_000));
const observed = heap1m.ms / heap100.ms;

console.log("\nGrowth analysis");
console.log(THIN);
console.log(
  `  heap   100k -> 1M   (10.0x data):  ${observed.toFixed(1)}x time`
);
console.log(
  `  naive    2k -> 5k   ( 2.5x data):  ${(naive5.ms / naive2.ms).toFixed(1)}x time` +
    `   (2.5^2 = 6.25 -> quadratic)`
);
console.log("");
console.log(`  Theory: comparisons/op grows log2(n)`);
console.log(
  `    log2(1M)/log2(100k) = ${(
    Math.log2(1_000_000) / Math.log2(100_000)
  ).toFixed(2)}x`
);
console.log(`    predicted total     = ${predicted.toFixed(1)}x`);
console.log(`    observed total      = ${observed.toFixed(1)}x`);
console.log(
  `    excess (memory/GC)  = ${(observed / predicted).toFixed(2)}x`
);

console.log("\nDiagnosis");
console.log(THIN);
console.log(
  `  String allocation cost @1M:  ${(s1mu.totalMs / s1mc.totalMs).toFixed(2)}x` +
    `  (unique vs constant IDs)`
);
console.log(
  `  Memory footprint @1M:        ${s1mu.heapMB.toFixed(0)} MB unique` +
    ` vs ${s1mc.heapMB.toFixed(0)} MB const`
);
console.log(
  `  Drain-only slowdown 100k->1M: ${(s1mu.drainMs / s100u.drainMs).toFixed(1)}x` +
    `  (drain allocates NOTHING)`
);
console.log("");
console.log("  If drain only also degrades >> 10x, cache locality is implicated.");
console.log("  If const IDs are much faster at 1M, string allocation is implicated.");
console.log("  Either way the heap ALGORITHM is O(log n) — the fuzz suite proves it.");
console.log("");
console.log("  Planned fix (Day 33): struct-of-arrays + index heap + numeric IDs.");
console.log("  Expected: zero allocations, flat ns/op across scale, 5-15x faster.");
console.log(`${LINE}\n`);