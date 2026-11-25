import { create } from "zustand";
import { simulationResultSchema, type SimulationResultDTO } from "@repo/schemas";
import { getSimWorker, terminateSimWorker } from "@/worker/client";

interface RunState {
  status: "idle" | "running" | "done" | "error";
  result: SimulationResultDTO | null;
  error: string | null;
  run: () => Promise<void>;
  cancel: () => void;
}

export const useRunStore = create<RunState>((set) => ({
  status: "idle",
  result: null,
  error: null,

  run: async () => {
    set({ status: "running", error: null });
    try {
      const api = getSimWorker();
      const raw = await api.runDemo(); // Promise — Comlink RPC

      const parsed = simulationResultSchema.safeParse(raw);
      if (!parsed.success) {
        set({ status: "error", error: "Worker returned an invalid result shape", result: null });
        return;
      }
      set({ status: "done", result: parsed.data });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        result: null,
      });
    }
  },

  cancel: () => {
    terminateSimWorker();
    set({ status: "idle", error: "Cancelled", result: null });
  },
}));