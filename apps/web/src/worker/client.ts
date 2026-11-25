import { wrap, type Remote } from "comlink";
import type { SimWorkerApi } from "./simWorker";

let worker: Worker | null = null;
let remote: Remote<SimWorkerApi> | null = null;

/**
 * Lazily spawns the worker on first use.
 * NEVER call during SSR — `Worker` does not exist in Node.
 */
export function getSimWorker(): Remote<SimWorkerApi> {
  if (typeof window === "undefined") {
    throw new Error("Sim worker is only available in the browser");
  }
  if (!remote) {
    worker = new Worker(new URL("./simWorker.ts", import.meta.url), {
      type: "module",
    });
    remote = wrap<SimWorkerApi>(worker);
  }
  return remote;
}

/** Hard stop. The next getSimWorker() spawns a fresh worker. */
export function terminateSimWorker(): void {
  worker?.terminate();
  worker = null;
  remote = null;
}