import * as Comlink from "comlink"
import { runDemoSimulation } from "@repo/sim-core"
import type { SimulationResultDTO } from "@repo/schemas"

/**
 * Everything exposed here becomes a Promise-returning method
 * on the main thread. Return ONLY plain DTOs — structured clone
 * strips prototypes and rejects functions.
 */

const api = {
    ping(): string{
        return "pong";
    },
    runDemo(): SimulationResultDTO{
        return runDemoSimulation();
    }
}

export type SimWorkerApi = typeof api;
Comlink.expose(api);