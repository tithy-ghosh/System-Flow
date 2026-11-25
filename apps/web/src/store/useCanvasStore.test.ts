import { describe, it, expect, beforeEach } from "vitest";
import type { ServerData } from "@repo/schemas";
import { useCanvasStore } from "./useCanvasStore";

beforeEach(() => {
  useCanvasStore.getState().resetCanvas();
});

describe("canvas undo/redo", () => {
  it("undo reverses addNode, redo reapplies it", () => {
    const { addNode, undo, redo } = useCanvasStore.getState();

    addNode("server");
    expect(useCanvasStore.getState().nodes).toHaveLength(1);

    undo();
    expect(useCanvasStore.getState().nodes).toHaveLength(0);

    redo();
    expect(useCanvasStore.getState().nodes).toHaveLength(1);
  });

  it("coalesces rapid edits of the same field into one undo step", () => {
    const { addNode, updateNodeData, undo } = useCanvasStore.getState();
    const id = addNode("server");

    updateNodeData(id, { workers: 5 });
    updateNodeData(id, { workers: 6 });
    updateNodeData(id, { workers: 7 });

    const data = () => useCanvasStore.getState().nodes[0].data as ServerData;
    expect(data().workers).toBe(7);

    undo(); // back to the value before the edit burst
    expect(data().workers).toBe(4);

    undo(); // back to empty canvas
    expect(useCanvasStore.getState().nodes).toHaveLength(0);
  });

  it("keyboard delete (remove change) is undoable", () => {
    const { addNode, onNodesChange, undo } = useCanvasStore.getState();
    const id = addNode("cache");

    onNodesChange([{ type: "remove", id }]);
    expect(useCanvasStore.getState().nodes).toHaveLength(0);

    undo();
    expect(useCanvasStore.getState().nodes).toHaveLength(1);
  });

  it("editing after undo clears the redo branch", () => {
    const { addNode, undo, redo, updateNodeData } = useCanvasStore.getState();
    const id = addNode("server");
    undo();
    const id2 = addNode("cache");
    expect(useCanvasStore.getState().future).toHaveLength(0);
    redo(); // no-op
    expect(useCanvasStore.getState().nodes).toHaveLength(1);
    expect(useCanvasStore.getState().nodes[0].id).toBe(id2);
  });

  it("caps history at 50 snapshots", () => {
    const { addNode } = useCanvasStore.getState();
    for (let i = 0; i < 60; i++) addNode("server");
    expect(useCanvasStore.getState().past).toHaveLength(50);
  });
});