import type { Node } from "@xyflow/react";
import { CacheData, ClientData, DatabaseData, LoadBalancerData, NodeKind, ServerData, SimNodeData } from "@repo/schemas";

export type { CacheData, ClientData, DatabaseData, LoadBalancerData, NodeKind, ServerData, SimNodeData };

export type ClientFlowNode = Node<ClientData, "client">;
export type LoadBalancerFlowNode = Node<LoadBalancerData, "loadBalancer">;
export type ServerFlowNode = Node<ServerData, "server">;
export type CacheFlowNode = Node<CacheData, "cache">;
export type DatabaseFlowNode = Node<DatabaseData, "database">;

export type SimFlowNode =
  | ClientFlowNode
  | LoadBalancerFlowNode
  | ServerFlowNode
  | CacheFlowNode
  | DatabaseFlowNode;

export type SimFlowEdge = {
  id: string;
  source: string;
  target: string;
};



/**
 * Defaults intentionally mirror sim-core engine configs.
 * One source of truth for "what does a fresh Server look like".
 */
export function createDefaultData(kind: NodeKind): SimNodeData {
  switch (kind) {
    case "client":
      return { kind, label: "Client", rps: 100, readRatio: 0.8 };
    case "loadBalancer":
      return { kind, label: "Load Balancer", algorithm: "round-robin" };
    case "server":
      return {
        kind,
        label: "App Server",
        workers: 4,
        meanServiceTime: 10,
        distribution: "lognormal",
        queueLimit: 100,
      };
    case "cache":
      return { kind, label: "Cache", hitRatio: 0.8, hitLatencyMs: 1, missPenaltyMs: 1 };
    case "database":
      return {
        kind,
        label: "Database",
        poolSize: 8,
        readLatencyMs: 20,
        writeLatencyMs: 40,
        queueLimit: 200,
      };
  }
}

let idCounter = 0;
export function nextNodeId(kind: NodeKind): string {
  idCounter += 1;
  return `${kind}-${idCounter}`;
}