import { z } from "zod";

export const labelSchema = z.string().min(1, "Label is required").max(40, "Max 40 characters");



export const clientDataSchema = z.object({
  kind: z.literal("client"),
  label: labelSchema,
  rps: z.number().int("Whole numbers only").min(1, "At least 1 req/s").max(100_000, "Max 100k req/s"),
  readRatio: z.number().min(0, "Must be ≥ 0").max(1, "Must be ≤ 1"),
});

export const loadBalancerDataSchema = z.object({
  kind: z.literal("loadBalancer"),
  label: labelSchema,
  algorithm: z.enum(["round-robin", "random"]),
});

export const serverDataSchema = z.object({
  kind: z.literal("server"),
  label: labelSchema,
  workers: z.number().int("Whole numbers only").min(1, "At least 1 worker").max(512, "Max 512 workers"),
  meanServiceTime: z.number().min(0.1, "Must be > 0").max(10_000, "Max 10s"),
  distribution: z.enum(["exponential", "lognormal"]),
  queueLimit: z.number().int("Whole numbers only").min(0, "0 = drop when busy").max(100_000),
});

export const cacheDataSchema = z.object({
  kind: z.literal("cache"),
  label: labelSchema,
  hitRatio: z.number().min(0, "Must be ≥ 0").max(1, "Must be ≤ 1"),
  hitLatencyMs: z.number().min(0, "Must be ≥ 0").max(1_000),
  missPenaltyMs: z.number().min(0, "Must be ≥ 0").max(1_000),
});

export const databaseDataSchema = z.object({
  kind: z.literal("database"),
  label: labelSchema,
  poolSize: z.number().int("Whole numbers only").min(1, "At least 1 connection").max(512),
  readLatencyMs: z.number().min(0.1, "Must be > 0").max(10_000),
  writeLatencyMs: z.number().min(0.1, "Must be > 0").max(10_000),
  queueLimit: z.number().int("Whole numbers only").min(0).max(100_000),
});

export const simNodeDataSchema = z.discriminatedUnion("kind", [
  clientDataSchema,
  loadBalancerDataSchema,
  serverDataSchema,
  cacheDataSchema,
  databaseDataSchema,
]);



export type ClientData = z.infer<typeof clientDataSchema>;
export type LoadBalancerData = z.infer<typeof loadBalancerDataSchema>;
export type ServerData = z.infer<typeof serverDataSchema>;
export type CacheData = z.infer<typeof cacheDataSchema>;
export type DatabaseData = z.infer<typeof databaseDataSchema>;
export type SimNodeData = z.infer<typeof simNodeDataSchema>;
export type NodeKind = SimNodeData["kind"];



export const flowNodeSchema = z
.object({
  id: z.string().min(1),
  type: z.enum(["client", "loadBalancer", "server", "cache", "database"]),
  position: z.object({ x: z.number(), y: z.number() }),
  data: simNodeDataSchema,
})
.refine((n) => n.type === n.data.kind, {
    message: "node.type musy match node.data.kind"
})

export const flowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
});

export const graphSchema = z.object({
  version: z.literal(1),
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
});

export type GraphJSON = z.infer<typeof graphSchema>;