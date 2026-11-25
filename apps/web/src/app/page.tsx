"use client";

import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect } from "react";
import { useCanvasStore } from "@/store/useCanvasStore";
import { ClientNode } from "@/components/nodes/ClientNode";
import { LoadBalancerNode } from "@/components/nodes/LoadBalancerNode";
import { ServerNode } from "@/components/nodes/ServerNode";
import { CacheNode } from "@/components/nodes/CacheNode";
import { DatabaseNode } from "@/components/nodes/DatabaseNode";
import type { NodeKind, SimFlowEdge, SimFlowNode } from "@/types/canvas";
import { PropertiesPanel } from "@/components/panel/PropertiesPanel";
import { RunPanel } from "@/components/run/RunPanel";
const nodeTypes = {
  client: ClientNode,
  loadBalancer: LoadBalancerNode,
  server: ServerNode,
  cache: CacheNode,
  database: DatabaseNode,
};

const toolbar: { kind: NodeKind; label: string; icon: string }[] = [
  { kind: "client", label: "Client", icon: "🌐" },
  { kind: "loadBalancer", label: "Load Balancer", icon: "⚖️" },
  { kind: "server", label: "Server", icon: "🖥️" },
  { kind: "cache", label: "Cache", icon: "⚡" },
  { kind: "database", label: "Database", icon: "🗄️" },
];

export default function Home() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const beginHistory = useCanvasStore((s) => s.beginHistory);
  const canUndo = useCanvasStore((s) => s.past.length > 0);
  const canRedo = useCanvasStore((s) => s.future.length > 0);
  const lastSavedAt = useCanvasStore((s) => s.lastSavedAt);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable
      )
        return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
  return (
    <div className="flex h-screen w-screen">
      <aside className="w-64 bg-[var(--color-surface-muted)] border-r border-[var(--color-border)] p-4">
        <h2 className="text-lg font-bold mb-4 text-[var(--color-foreground)]">
          Components
        </h2>
        <div className="space-y-2">
          {toolbar.map((btn) => (
            <button
              key={btn.kind}
              onClick={() => addNode(btn.kind)}
              className="w-full text-left px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md hover:border-[var(--color-accent)] transition-colors flex items-center gap-2 text-[var(--color-foreground)]"
            >
              <span className="text-xl">{btn.icon}</span>
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:border-[var(--color-accent)] disabled:opacity-40"
          >
            ↩ Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:border-[var(--color-accent)] disabled:opacity-40"
          >
            ↪ Redo
          </button>
        </div>

        <p className="mt-4 text-xs text-[var(--color-text-subtle)]">
          {lastSavedAt
            ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
            : "Not saved yet"}
        </p>
        <RunPanel />
      </aside>

      <main className="flex-1">
        <ReactFlow<SimFlowNode, SimFlowEdge>
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => selectNode(node.id)}
          onPaneClick={() => selectNode(null)}
          nodeTypes={nodeTypes}
          onNodeDragStart={() => beginHistory()}
          fitView
        >
          <Background color="var(--color-canvas-dot)" />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </main>
      <PropertiesPanel />
    </div>
  );
}
