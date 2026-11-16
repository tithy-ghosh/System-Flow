import { describe, it, expect } from "vitest";
import { EventQueue } from "./event-queue";
import type { EventInput, SimEvent } from "./event";

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

function ev(time: number, i: number): EventInput {
  return { time, type: "ARRIVAL", nodeId: "n1", requestId: `r${i}`, attempt: 0 };
}

/** O(n) invariant scan — used at checkpoints only, never per-operation. */
function heapIsInvalid(q: EventQueue): boolean {
  const arr = q.toArray();
  const before = (a: SimEvent, b: SimEvent) =>
    a.time !== b.time ? a.time < b.time : a.seq < b.seq;

  for (let i = 0; i < arr.length; i++) {
    for (const c of [2 * i + 1, 2 * i + 2]) {
      if (c < arr.length && before(arr[c], arr[i])) return true;
    }
  }
  return false;
}

describe("EventQueue at scale", () => {
  it(
    "drains 100k events in non-decreasing (time, seq) order",
    () => {
      const N = 100_000;
      const rand = mulberry32(20261117);
      const q = new EventQueue();

      for (let i = 0; i < N; i++) {
        // Quantized to 1ms buckets over a 10s window → ~10 events per bucket.
        // This forces heavy tie collisions at realistic scale.
        q.push(ev(Math.floor(rand() * 10_000), i));

        // Spot-check the invariant every 20k pushes (O(n) each, so 5 scans total).
        if (i % 20_000 === 0) expect(heapIsInvalid(q)).toBe(false);
      }

      expect(q.size).toBe(N);
      expect(heapIsInvalid(q)).toBe(false);

      let prevTime = -Infinity;
      let prevSeq = -1;
      let violations = 0;
      let count = 0;

      while (!q.isEmpty) {
        const e = q.pop()!;
        if (e.time < prevTime || (e.time === prevTime && e.seq <= prevSeq)) {
          violations++;
        }
        prevTime = e.time;
        prevSeq = e.seq;
        count++;
      }

      // ONE assertion, not 200k. Assertion overhead dominates at this scale.
      expect(violations).toBe(0);
      expect(count).toBe(N);
      expect(q.isEmpty).toBe(true);
    },
    30_000
  );

  it("survives repeated clear() and reuse", () => {
    const q = new EventQueue();
    const rand = mulberry32(99);

    for (let round = 0; round < 20; round++) {
      for (let i = 0; i < 500; i++) q.push(ev(rand() * 1000, i));
      expect(q.size).toBe(500);

      let prev = -Infinity;
      while (!q.isEmpty) {
        const e = q.pop()!;
        expect(e.time).toBeGreaterThanOrEqual(prev);
        prev = e.time;
      }

      q.clear();
      expect(q.size).toBe(0);
      expect(q.pop()).toBeUndefined();
    }
  });
});