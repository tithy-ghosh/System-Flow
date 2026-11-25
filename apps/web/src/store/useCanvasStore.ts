import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import {
  createDefaultData,
  nextNodeId,
  type NodeKind,
  type SimFlowEdge,
  type SimFlowNode,
  type SimNodeData,
} from "@/types/canvas";

interface CanvasState {
  nodes: SimFlowNode[];
  edges: SimFlowEdge[];
  selectedNodeId: string | null;

  onNodesChange: (changes: NodeChange<SimFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<SimFlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (kind: NodeKind) => string;
  updateNodeData: (id: string, patch: Partial<SimNodeData>) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  // React Flow reports drags/selections/deletions as change arrays.
  // applyNodeChanges is the official reducer — never mutate nodes yourself.
  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges<SimFlowNode>(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({ edges: addEdge({ ...connection, id: `e-${connection.source}-${connection.target}` }, get().edges) }),

  addNode: (kind) => {
    const id = nextNodeId(kind);
    const count = get().nodes.length;
    const node = {
      id,
      type: kind,
      position: { x: 80 + (count % 4) * 60, y: 80 + (count % 4) * 60 },
      data: createDefaultData(kind),
    } as SimFlowNode;

    set({ nodes: [...get().nodes, node] });
    return id;
  },

  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } as SimNodeData } : n
      ) as SimFlowNode[],
    }),

  removeNode: (id) =>
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    }),

  selectNode: (id) => set({ selectedNodeId: id }),

  clearCanvas: () => set({ nodes: [], edges: [], selectedNodeId: null }),
}));