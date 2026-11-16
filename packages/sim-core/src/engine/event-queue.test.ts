import { describe, it, expect } from "vitest";
import { EventQueue } from "./event-queue";
import type { EventInput } from "./event";

const ev = (time: number): EventInput => ({
  time,
  type: "ARRIVAL",
  nodeId: "n1",
  requestId: `r${time}`,
  attempt: 0,
});

describe("EventQueue", () => {
  it("pops in time order regardless of insert order", () => {
    const q = new EventQueue();
    [5, 3, 9, 1, 7, 2, 8].forEach((t) => q.push(ev(t)));

    const out: number[] = [];
    while (!q.isEmpty) out.push(q.pop()!.time);

    expect(out).toEqual([1, 2, 3, 5, 7, 8, 9]);
  });

  it("breaks ties by insertion order", () => {
    const q = new EventQueue();
    const a = q.push(ev(100));
    const b = q.push(ev(100));
    const c = q.push(ev(100));

    expect(q.pop()).toBe(a);
    expect(q.pop()).toBe(b);
    expect(q.pop()).toBe(c);
  });

  it("handles single-element pop", () => {
    const q = new EventQueue();
    q.push(ev(1));
    expect(q.pop()?.time).toBe(1);
    expect(q.isEmpty).toBe(true);
    expect(q.pop()).toBeUndefined();
  });
});