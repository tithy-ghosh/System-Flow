"use client";

import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCanvasStore } from "@/store/useCanvasStore";
import { ClientNode } from "@/components/nodes/ClientNode";
import { LoadBalancerNode } from "@/components/nodes/LoadBalancerNode";
import { ServerNode } from "@/components/nodes/ServerNode";
import { CacheNode } from "@/components/nodes/CacheNode";
import { DatabaseNode } from "@/components/nodes/DatabaseNode";
import type { NodeKind, SimFlowEdge, SimFlowNode } from "@/types/canvas";

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

  return (
    <div className="flex h-screen w-screen">
      <aside className="w-64 bg-[var(--color-surface-muted)] border-r border-[var(--color-border)] p-4">
        <h2 className="text-lg font-bold mb-4 text-[var(--color-foreground)]">Components</h2>
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
          fitView
        >
          <Background color="var(--color-canvas-dot)" />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </main>
    </div>
  );
}