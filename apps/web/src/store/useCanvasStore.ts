import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { graphSchema } from "@repo/schemas";
import {
  createDefaultData,
  nextNodeId,
  syncIdCounter,
  type NodeKind,
  type SimFlowEdge,
  type SimFlowNode,
  type SimNodeData,
} from "@/types/canvas";

const STORAGE_KEY = "systemflow:canvas:v1";
const HISTORY_LIMIT = 50;
const EDIT_COALESCE_MS = 900;
const SAVE_DEBOUNCE_MS = 500;

interface Snapshot {
  nodes: SimFlowNode[];
  edges: SimFlowEdge[];
}

interface CanvasState extends Snapshot {
  selectedNodeId: string | null;
  past: Snapshot[];
  future: Snapshot[];
  lastSavedAt: number | null;

  onNodesChange: (changes: NodeChange<SimFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<SimFlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (kind: NodeKind) => string;
  updateNodeData: (id: string, patch: Partial<SimNodeData>) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  clearCanvas: () => void;
  resetCanvas: () => void;

  beginHistory: () => void;
  undo: () => void;
  redo: () => void;
}

function snapshotOf(s: CanvasState): Snapshot {
  return { nodes: s.nodes, edges: s.edges };
}

/** Hydrate from localStorage, validated by the shared schema. SSR-safe. */
function loadSavedGraph(): Snapshot {
  if (typeof window === "undefined") return { nodes: [], edges: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { nodes: [], edges: [] };

    const parsed = graphSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn("[canvas] saved graph failed validation; starting fresh");
      return { nodes: [], edges: [] };
    }

    syncIdCounter(parsed.data.nodes);
    return {
      nodes: parsed.data.nodes as SimFlowNode[],
      edges: parsed.data.edges,
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

// Coalescing state lives OUTSIDE the store → changes don't re-render anything.
let lastEditKey = "";
let lastEditAt = 0;

export const useCanvasStore = create<CanvasState>((set, get) => {
  const pushSnapshot = () => {
    const { past } = get();
    set({
      past: [...past.slice(-(HISTORY_LIMIT - 1)), snapshotOf(get())],
      future: [],
    });
  };

  return {
    ...loadSavedGraph(),
    selectedNodeId: null,
    past: [],
    future: [],
    lastSavedAt: null,

    onNodesChange: (changes) => {
      if (changes.some((c) => c.type === "remove")) pushSnapshot();
      set({ nodes: applyNodeChanges(changes, get().nodes) });
    },

    onEdgesChange: (changes) => {
      if (changes.some((c) => c.type === "remove")) pushSnapshot();
      set({ edges: applyEdgeChanges(changes, get().edges) });
    },

    onConnect: (connection) => {
      pushSnapshot();
      set({
        edges: addEdge(
          { ...connection, id: `e-${connection.source}-${connection.target}` },
          get().edges,
        ),
      });
    },

    addNode: (kind) => {
      pushSnapshot();
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

    updateNodeData: (id, patch) => {
      const key = `${id}:${Object.keys(patch).sort().join(",")}`;
      const now = Date.now();
      if (key !== lastEditKey || now - lastEditAt > EDIT_COALESCE_MS) {
        pushSnapshot();
      }
      lastEditKey = key;
      lastEditAt = now;

      set({
        nodes: get().nodes.map((n): SimFlowNode => {
          if (n.id !== id) return n;

          return { ...n, data: { ...n.data, ...patch } } as SimFlowNode;
        }),
      });
    },

    removeNode: (id) => {
      pushSnapshot();
      set({
        nodes: get().nodes.filter((n) => n.id !== id),
        edges: get().edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId:
          get().selectedNodeId === id ? null : get().selectedNodeId,
      });
    },

    selectNode: (id) => set({ selectedNodeId: id }),

    clearCanvas: () => {
      pushSnapshot();
      set({ nodes: [], edges: [], selectedNodeId: null });
    },

    /** Hard wipe including history. Used by tests and future "New" button. */
    resetCanvas: () =>
      set({ nodes: [], edges: [], selectedNodeId: null, past: [], future: [] }),

    beginHistory: () => pushSnapshot(),

    undo: () => {
      const { past, future } = get();
      if (past.length === 0) return;
      const prev = past[past.length - 1];
      set({
        nodes: prev.nodes,
        edges: prev.edges,
        past: past.slice(0, -1),
        future: [...future, snapshotOf(get())],
        selectedNodeId: null,
      });
    },

    redo: () => {
      const { past, future } = get();
      if (future.length === 0) return;
      const next = future[future.length - 1];
      set({
        nodes: next.nodes,
        edges: next.edges,
        future: future.slice(0, -1),
        past: [...past, snapshotOf(get())],
        selectedNodeId: null,
      });
    },
  };
});

let saveTimer: ReturnType<typeof setTimeout> | null = null;

useCanvasStore.subscribe((state, prev) => {
  if (state.nodes === prev.nodes && state.edges === prev.edges) return;
  if (typeof window === "undefined") return;

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const res = graphSchema.safeParse({
      version: 1,
      nodes: state.nodes,
      edges: state.edges,
    });
    if (!res.success) return; // never persist an invalid graph

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
      useCanvasStore.setState({ lastSavedAt: Date.now() });
    } catch {
      /* storage blocked or full — silently skip this save */
    }
  }, SAVE_DEBOUNCE_MS);
});
