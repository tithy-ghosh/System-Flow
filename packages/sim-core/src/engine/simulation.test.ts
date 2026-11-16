import { describe, it, expect } from "vitest";
import {
  Simulation,
  SimulationError,
  PastSchedulingError,
  EventCapExceededError,
  UnknownNodeError,
} from "./simulation";
import type { EventInput } from "./event";

function input(time: number, nodeId: string, id = "r1"): EventInput {
  return { time, type: "ARRIVAL", nodeId, requestId: id, attempt: 0 };
}

describe("Simulation loop", () => {
  it("drains an empty queue", () => {
    const sim = new Simulation({ endTime: 1000 });
    const r = sim.run();
    expect(r.stopReason).toBe("drained");
    expect(r.eventsProcessed).toBe(0);
    expect(r.finalTime).toBe(0);
  });

  it("dispatches in time order and never moves the clock backwards", () => {
    const sim = new Simulation({ endTime: 1000, captureTrace: true });
    const seen: number[] = [];

    sim.register("n", (_e, ctx) => {
      seen.push(ctx.now);
    });

    [90, 10, 50, 10, 30].forEach((t, i) => sim.schedule(input(t, "n", `r${i}`)));
    const r = sim.run();

    expect(r.stopReason).toBe("drained");
    expect(r.eventsProcessed).toBe(5);
    expect(seen).toEqual([10, 10, 30, 50, 90]);

    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    }
  });

  it("stops at the horizon without dispatching past it", () => {
    const sim = new Simulation({ endTime: 25, captureTrace: true });
    sim.register("n", () => {});

    [10, 20, 30, 40].forEach((t) => sim.schedule(input(t, "n")));
    const r = sim.run();

    expect(r.stopReason).toBe("horizon");
    expect(r.eventsProcessed).toBe(2);
    expect(r.finalTime).toBe(20);
    expect(r.remainingEvents).toBe(2);
    expect(r.trace!.map((e) => e.time)).toEqual([10, 20]);
  });

  it("processes a causal chain scheduled by a handler", () => {
    const sim = new Simulation({ endTime: 1000, captureTrace: true });

    sim.register("a", (e, ctx) => {
      ctx.schedule(input(ctx.now + 5, "b", e.requestId));
    });
    sim.register("b", (e, ctx) => {
      ctx.schedule(input(ctx.now + 3, "c", e.requestId));
    });
    sim.register("c", () => {});

    sim.schedule(input(0, "a"));
    const r = sim.run();

    expect(r.eventsProcessed).toBe(3);
    expect(r.finalTime).toBe(8);
    expect(r.trace!.map((e) => e.nodeId)).toEqual(["a", "b", "c"]);
  });

  it("allows zero-delay events at the same timestamp", () => {
    const sim = new Simulation({ endTime: 100, captureTrace: true });
    let hops = 0;

    sim.register("hop", (e, ctx) => {
      hops++;
      if (hops < 5) ctx.schedule(input(ctx.now, "hop", e.requestId));
    });

    sim.schedule(input(10, "hop"));
    const r = sim.run();

    expect(r.eventsProcessed).toBe(5);
    expect(r.finalTime).toBe(10); // time never advanced
  });

  it("does not capture a trace unless asked", () => {
    const sim = new Simulation({ endTime: 100 });
    sim.register("n", () => {});
    sim.schedule(input(1, "n"));
    expect(sim.run().trace).toBeUndefined();
  });
});

describe("Simulation guards", () => {
  it("rejects scheduling in the past", () => {
    const sim = new Simulation({ endTime: 1000 });
    sim.register("bad", (_e, ctx) => {
      ctx.schedule(input(ctx.now - 1, "bad"));
    });
    sim.schedule(input(10, "bad"));

    expect(() => sim.run()).toThrow(PastSchedulingError);
  });

  it("rejects NaN and Infinity event times", () => {
    const sim = new Simulation({ endTime: 1000 });
    expect(() => sim.schedule(input(NaN, "n"))).toThrow(SimulationError);
    expect(() => sim.schedule(input(Infinity, "n"))).toThrow(SimulationError);
  });

  it("rejects negative event times", () => {
    const sim = new Simulation({ endTime: 1000 });
    expect(() => sim.schedule(input(-5, "n"))).toThrow(PastSchedulingError);
  });

  it("trips the event cap on a zero-delay infinite loop", () => {
    const sim = new Simulation({ endTime: 1000, maxEvents: 1000 });
    sim.register("loop", (e, ctx) => {
      ctx.schedule(input(ctx.now, "loop", e.requestId)); // never advances time
    });
    sim.schedule(input(0, "loop"));

    expect(() => sim.run()).toThrow(EventCapExceededError);
    expect(sim.eventsProcessed).toBe(1001);
  });

  it("throws on an unregistered node", () => {
    const sim = new Simulation({ endTime: 1000 });
    sim.schedule(input(5, "ghost"));
    expect(() => sim.run()).toThrow(UnknownNodeError);
  });

  it("rejects invalid options", () => {
    expect(() => new Simulation({ endTime: 0 })).toThrow(SimulationError);
    expect(() => new Simulation({ endTime: NaN })).toThrow(SimulationError);
    expect(() => new Simulation({ endTime: 10, maxEvents: 0 })).toThrow(
      SimulationError
    );
  });

  it("forbids rewiring mid-run", () => {
    const sim = new Simulation({ endTime: 100 });
    sim.register("n", () => {
      expect(() => sim.register("other", () => {})).toThrow(SimulationError);
    });
    sim.schedule(input(1, "n"));
    sim.run();
  });
});

describe("Simulation determinism", () => {
  it("produces identical results across reset + rerun", () => {
    const sim = new Simulation({ endTime: 500, captureTrace: true });

    sim.register("a", (e, ctx) => {
      ctx.schedule(input(ctx.now + 7, "b", e.requestId));
    });
    sim.register("b", () => {});

    const seed = () => {
      [40, 10, 25, 10].forEach((t, i) => sim.schedule(input(t, "a", `r${i}`)));
    };

    seed();
    const first = sim.run();

    sim.reset();
    expect(sim.now).toBe(0);
    expect(sim.pending).toBe(0);

    seed();
    const second = sim.run();

    expect(second.eventsProcessed).toBe(first.eventsProcessed);
    expect(second.finalTime).toBe(first.finalTime);
    expect(second.trace).toEqual(first.trace);
    // seq must also match — proves the counter reset correctly
    expect(second.trace!.map((e) => e.seq)).toEqual(
      first.trace!.map((e) => e.seq)
    );
  });
});