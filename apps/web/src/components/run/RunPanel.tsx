"use client";

import { useRunStore } from "@/store/useRunStore";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt>{k}</dt>
      <dd className="font-semibold text-[var(--color-text)]">{v}</dd>
    </div>
  );
}

export function RunPanel() {
  const status = useRunStore((s) => s.status);
  const result = useRunStore((s) => s.result);
  const error = useRunStore((s) => s.error);
  const run = useRunStore((s) => s.run);
  const cancel = useRunStore((s) => s.cancel);

  return (
    <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <h3 className="mb-2 text-sm font-bold text-[var(--color-text)]">Simulation</h3>

      {status !== "running" ? (
        <button
          onClick={run}
          className="w-full rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)]"
        >
          ▶ Run demo
        </button>
      ) : (
        <button
          onClick={cancel}
          className="w-full rounded-md bg-[var(--color-error)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)]"
        >
          ■ Cancel
        </button>
      )}

      <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
        {status === "running"
          ? "Running in worker thread…"
          : status === "error"
            ? error
            : status === "done" && result
              ? `Simulated ${(result.finalTime / 1000).toFixed(0)}s in ${result.durationMs.toFixed(0)}ms wall-clock`
              : "Idle"}
      </p>

      {result && (
        <dl className="mt-2 space-y-1 text-xs text-[var(--color-text-muted)]">
          <Row k="Requests" v={result.latency.count.toLocaleString()} />
          <Row k="Mean latency" v={`${result.latency.mean.toFixed(1)} ms`} />
          <Row k="p95" v={`${result.latency.p95.toFixed(0)} ms`} />
          <Row k="p99" v={`${result.latency.p99.toFixed(0)} ms`} />
          <Row k="Cache hits" v={`${result.cacheHits.toLocaleString()} (${Math.round((result.cacheHits / (result.cacheHits + result.cacheMisses)) * 100)}%)`} />
          <Row k="DB queries" v={result.dbQueries.toLocaleString()} />
          <Row k="Dropped" v={String(result.dropped)} />
        </dl>
      )}
    </div>
  );
}