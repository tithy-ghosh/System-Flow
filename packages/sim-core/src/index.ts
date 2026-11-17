export const VERSION = "0.1.0";

export function hello() {
  return "sim-core is alive";
}

export * from "./engine/event";
export * from "./engine/event-queue"
export * from "./engine/simulation";
export * from "./nodes/server";
export * from "./utils/rng";
export * from "./nodes/client";
export * from "./nodes/load-balancer";