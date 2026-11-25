"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ClientNode } from "@/components/nodes/ClientNode";
import { LoadBalancerNode } from "@/components/nodes/LoadBalancerNode";
import { ServerNode } from "@/components/nodes/ServerNode";
import { CacheNode } from "@/components/nodes/CacheNode";
import { DatabaseNode } from "@/components/nodes/DatabaseNode";

const nodeTypes = {
  client: ClientNode,
  loadBalancer: LoadBalancerNode,
  server: ServerNode,
  cache: CacheNode,
  database: DatabaseNode,
};

type NodeType = keyof typeof nodeTypes;

const nodeButtons: { type: NodeType; label: string; icon: string }[] = [
  { type: "client", label: "Client", icon: "🌐" },
  { type: "loadBalancer", label: "Load Balancer", icon: "⚖️" },
  { type: "server", label: "Server", icon: "🖥️" },
  { type: "cache", label: "Cache", icon: "⚡" },
  { type: "database", label: "Database", icon: "🗄️" },
];

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export default function Home() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeCounter, setNodeCounter] = useState(0);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addNode = (type: NodeType) => {
    const id = `${type}-${nodeCounter}`;
    const newNode: Node = {
      id,
      type,
      position: {
        x: 100 + (nodeCounter % 5) * 50,
        y: 100 + (nodeCounter % 5) * 50,
      },
      data: { label: `${type}` },
    };
    setNodes((nds) => [...nds, newNode]);
    setNodeCounter((c) => c + 1);
  };

  return (
    <div className="flex h-screen w-screen">
      {/* Toolbar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Components</h2>
        <div className="space-y-2">
          {nodeButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => addNode(btn.type)}
              className="w-full text-left px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <span className="text-xl">{btn.icon}</span>
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
