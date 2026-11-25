"use client";

import {
  cacheDataSchema,
  clientDataSchema,
  databaseDataSchema,
  labelSchema,
  loadBalancerDataSchema,
  serverDataSchema,
  type CacheData,
  type ClientData,
  type DatabaseData,
  type LoadBalancerData,
  type ServerData,
} from "@repo/schemas";
import { useCanvasStore } from "@/store/useCanvasStore";
import { NumberField, RangeField, SelectField, TextField } from "./fields";

function ClientForm({ id, data }: { id: string; data: ClientData }) {
  const update = useCanvasStore((s) => s.updateNodeData);
  return (
    <>
      <NumberField label="Requests / sec" initial={data.rps} schema={clientDataSchema.shape.rps} onCommit={(v) => update(id, { rps: v })} />
      <RangeField label="Read mix" initial={data.readRatio} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onCommit={(v) => update(id, { readRatio: v })} />
    </>
  );
}

function LoadBalancerForm({ id, data }: { id: string; data: LoadBalancerData }) {
  const update = useCanvasStore((s) => s.updateNodeData);
  return (
    <SelectField
      label="Algorithm"
      initial={data.algorithm}
      options={[
        { value: "round-robin", label: "Round Robin" },
        { value: "random", label: "Random" },
      ]}
      onCommit={(v) => update(id, { algorithm: v })}
    />
  );
}

function ServerForm({ id, data }: { id: string; data: ServerData }) {
  const update = useCanvasStore((s) => s.updateNodeData);
  return (
    <>
      <NumberField label="Workers" initial={data.workers} schema={serverDataSchema.shape.workers} onCommit={(v) => update(id, { workers: v })} />
      <NumberField label="Mean service time (ms)" initial={data.meanServiceTime} step={0.5} schema={serverDataSchema.shape.meanServiceTime} onCommit={(v) => update(id, { meanServiceTime: v })} />
      <SelectField
        label="Distribution"
        initial={data.distribution}
        options={[
          { value: "lognormal", label: "Lognormal (realistic tails)" },
          { value: "exponential", label: "Exponential (M/M/1)" },
        ]}
        onCommit={(v) => update(id, { distribution: v })}
      />
      <NumberField label="Queue limit" initial={data.queueLimit} schema={serverDataSchema.shape.queueLimit} onCommit={(v) => update(id, { queueLimit: v })} />
    </>
  );
}

function CacheForm({ id, data }: { id: string; data: CacheData }) {
  const update = useCanvasStore((s) => s.updateNodeData);
  return (
    <>
      <RangeField label="Hit ratio" initial={data.hitRatio} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onCommit={(v) => update(id, { hitRatio: v })} />
      <NumberField label="Hit latency (ms)" initial={data.hitLatencyMs} step={0.1} schema={cacheDataSchema.shape.hitLatencyMs} onCommit={(v) => update(id, { hitLatencyMs: v })} />
      <NumberField label="Miss penalty (ms)" initial={data.missPenaltyMs} step={0.1} schema={cacheDataSchema.shape.missPenaltyMs} onCommit={(v) => update(id, { missPenaltyMs: v })} />
    </>
  );
}

function DatabaseForm({ id, data }: { id: string; data: DatabaseData }) {
  const update = useCanvasStore((s) => s.updateNodeData);
  return (
    <>
      <NumberField label="Connection pool" initial={data.poolSize} schema={databaseDataSchema.shape.poolSize} onCommit={(v) => update(id, { poolSize: v })} />
      <NumberField label="Read latency (ms)" initial={data.readLatencyMs} step={0.5} schema={databaseDataSchema.shape.readLatencyMs} onCommit={(v) => update(id, { readLatencyMs: v })} />
      <NumberField label="Write latency (ms)" initial={data.writeLatencyMs} step={0.5} schema={databaseDataSchema.shape.writeLatencyMs} onCommit={(v) => update(id, { writeLatencyMs: v })} />
      <NumberField label="Queue limit" initial={data.queueLimit} schema={databaseDataSchema.shape.queueLimit} onCommit={(v) => update(id, { queueLimit: v })} />
    </>
  );
}

export function PropertiesPanel() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === s.selectedNodeId));
  const update = useCanvasStore((s) => s.updateNodeData);

  if (!node) {
    return (
      <aside className="w-80 shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-subtle)]">
        Select a node to edit its properties.
      </aside>
    );
  }

  const data = node.data;

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-lg font-bold text-[var(--color-text)]">{data.label}</h2>
      <p className="mb-4 text-xs uppercase tracking-wide text-[var(--color-text-subtle)]">{data.kind}</p>

      {/* key resets drafts whenever selection changes */}
      <div key={node.id}>
        <TextField label="Label" initial={data.label} schema={labelSchema} onCommit={(v) => update(node.id, { label: v })} />

        {data.kind === "client" && <ClientForm id={node.id} data={data} />}
        {data.kind === "loadBalancer" && <LoadBalancerForm id={node.id} data={data} />}
        {data.kind === "server" && <ServerForm id={node.id} data={data} />}
        {data.kind === "cache" && <CacheForm id={node.id} data={data} />}
        {data.kind === "database" && <DatabaseForm id={node.id} data={data} />}
      </div>
    </aside>
  );
}