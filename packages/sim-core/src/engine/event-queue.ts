import type { EventInput, SimEvent } from "./event";

/**
 * A min-heap priority queue of simulation events.
 *
 * Ordering: earliest `time` first. Ties are broken by `seq` (insertion order),
 * which guarantees the simulation is deterministic and reproducible.
 *
 * Complexities: push O(log n) · pop O(log n) · peek O(1)
 *
 * The heap is stored as a flat array (complete binary tree):
 *   parent(i) = floor((i - 1) / 2)
 *   left(i)   = 2i + 1
 *   right(i)  = 2i + 2
 */
export class EventQueue {
  private heap: SimEvent[] = [];

  private counter = 0;



  /** Insert an event. */
  push(input: EventInput): SimEvent {
    const event: SimEvent = { ...input, seq: this.counter++ };
    this.heap.push(event);
    this.siftUp(this.heap.length - 1);
    return event;
  }

  /** Remove and return the earliest event, or undefined if empty. */
  pop(): SimEvent | undefined {
    const n = this.heap.length;
    if (n === 0) return undefined;

    const root = this.heap[0];
    const last = this.heap.pop();

    // Edge case: the heap had exactly one element, so `last` IS the root.
    // The array is now empty — nothing to sift.
    if (n === 1 || last === undefined) return root;

    // Move the former last element to the root and restore the invariant.
    this.heap[0] = last;
    this.siftDown(0);

    return root;
  }

  /** Return the earliest event without removing it. */
  peek(): SimEvent | undefined {
    return this.heap[0];
  }

  get size(): number {
    return this.heap.length;
  }

  get isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Reset the queue for a fresh run.
   * The seq counter resets too, so identical inputs produce identical seqs.
   */
  clear(): void {
    this.heap = [];
    this.counter = 0;
  }

  /**
   * Read-only view of the internal array, in heap order (NOT sorted order).
   */
  toArray(): readonly SimEvent[] {
    return this.heap;
  }



  /**
   * The single source of truth for ordering.
   */
  private comesBefore(a: SimEvent, b: SimEvent): boolean {
    if (a.time !== b.time) return a.time < b.time;
    return a.seq < b.seq;
  }

  private swap(i: number, j: number): void {
    const tmp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = tmp;
  }

  /** Bubble the element at `i` up until its parent sorts before it. */
  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1; // floor((i - 1) / 2)
      if (this.comesBefore(this.heap[i], this.heap[parent])) {
        this.swap(i, parent);
        i = parent;
      } else {
        return;
      }
    }
  }

  /** Push the element at `i` down until both children sort after it. */
  private siftDown(i: number): void {
    const n = this.heap.length;

    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;


      if (left < n && this.comesBefore(this.heap[left], this.heap[smallest])) {
        smallest = left;
      }
      if (right < n && this.comesBefore(this.heap[right], this.heap[smallest])) {
        smallest = right;
      }

      if (smallest === i) return;

      this.swap(i, smallest);
      i = smallest;
    }
  }
}