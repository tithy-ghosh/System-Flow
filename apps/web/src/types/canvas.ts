import type { Node } from "@xyflow/react";

// ------------------------------------------------------------- node data

export type ClientData = {
  kind: "client";
  label: string;
  rps: number;
  readRatio: number;
};

export type LoadBalancerData = {
  kind: "loadBalancer";
  label: string;
  algorithm: "round-robin" | "random";
};

export type ServerData = {
  kind: "server";
  label: string;
  workers: number;
  meanServiceTime: number;
  distribution: "exponential" | "lognormal";
  queueLimit: number;
};

export type CacheData = {
  kind: "cache";
  label: string;
  hitRatio: number;
  hitLatencyMs: number;
  missPenaltyMs: number;
};

export type DatabaseData = {
  kind: "database";
  label: string;
  poolSize: number;
  readLatencyMs: number;
  writeLatencyMs: number;
  queueLimit: number;
};

export type SimNodeData =
  | ClientData
  | LoadBalancerData
  | ServerData
  | CacheData
  | DatabaseData;

export type NodeKind = SimNodeData["kind"];

// ------------------------------------------------------- typed flow nodes

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

// ------------------------------------------------------------ defaults

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