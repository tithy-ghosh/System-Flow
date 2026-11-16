import { describe, it, expect } from "vitest";
import { EventQueue } from "./event-queue";
import type { EventInput, SimEvent } from "./event";

// ---------------------------------------------------------------- helpers

function ev(time: number, requestId: string): EventInput {
  return { time, type: "ARRIVAL", nodeId: "n1", requestId, attempt: 0 };
}

/**
 * Independent reimplementation of the ordering rule.
 * Deliberately NOT imported from EventQueue — a test must never trust
 * the same code it is verifying.
 */
function precedes(a: SimEvent, b: SimEvent): boolean {
  if (a.time !== b.time) return a.time < b.time;
  return a.seq < b.seq;
}

/**
 * Walks the flat array and checks the min-heap invariant:
 * every parent must sort before (or equal to) both of its children.
 * Returns a list of violations. Empty array = valid heap.
 */
function heapViolations(q: EventQueue): string[] {
  const arr = q.toArray();
  const problems: string[] = [];

  for (let i = 0; i < arr.length; i++) {
    for (const child of [2 * i + 1, 2 * i + 2]) {
      if (child >= arr.length) continue;
      if (precedes(arr[child], arr[i])) {
        problems.push(
          `child[${child}] (t=${arr[child].time}, seq=${arr[child].seq}) ` +
            `sorts before parent[${i}] (t=${arr[i].time}, seq=${arr[i].seq})`
        );
      }
    }
  }
  return problems;
}

/** Mulberry32 — tiny seeded PRNG so any failure is reproducible. */
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

/**
 * Deliberately dumb reference implementation.
 * Full sort on every extraction — O(n log n) per pop, but correct by construction.
 */
class NaiveQueue {
  private items: SimEvent[] = [];
  private counter = 0;

  push(input: EventInput): SimEvent {
    const e: SimEvent = { ...input, seq: this.counter++ };
    this.items.push(e);
    return e;
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

// ------------------------------------------------------------------ tests

describe("heap invariant", () => {
  it("holds after every operation in a randomized churn", () => {
    const rand = mulberry32(42);
    const q = new EventQueue();
    let pushed = 0;
    let popped = 0;

    for (let step = 0; step < 2000; step++) {
      if (rand() < 0.65 || q.isEmpty) {
        q.push(ev(Math.floor(rand() * 50), `r${pushed++}`));
      } else {
        q.pop();
        popped++;
      }

      expect(heapViolations(q)).toEqual([]);
      // Conservation: nothing lost, nothing duplicated.
      expect(q.size).toBe(pushed - popped);
    }
  });
});

describe("fuzz vs naive reference", () => {
  it.each([1, 42, 1337, 99991, 2026])("matches reference (seed %i)", (seed) => {
    const rand = mulberry32(seed);
    const q = new EventQueue();
    const ref = new NaiveQueue();
    let pushes = 0;

    for (let step = 0; step < 1000; step++) {
      const shouldPush = ref.size === 0 || rand() < 0.6;

      if (shouldPush) {
        // Small time domain (0,10,...140) forces MANY deliberate ties.
        const input = ev(Math.floor(rand() * 15) * 10, `req-${pushes++}`);
        const a = q.push(input);
        const b = ref.push(input);
        expect(a.seq).toBe(b.seq);
      } else {
        const a = q.pop();
        const b = ref.pop();
        expect(a).toEqual(b);
      }

      expect(q.size).toBe(ref.size);
      expect(heapViolations(q)).toEqual([]);
    }

    // Drain both fully and compare the entire ordering.
    const drained: SimEvent[] = [];
    while (ref.size > 0) {
      const a = q.pop()!;
      const b = ref.pop()!;
      expect(a).toEqual(b);
      drained.push(a);
    }

    expect(q.isEmpty).toBe(true);

    for (let i = 1; i < drained.length; i++) {
      expect(drained[i].time).toBeGreaterThanOrEqual(drained[i - 1].time);
    }
  });
});