import { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { CacheFlowNode } from "@/types/canvas";

export function CacheNode({ data }: NodeProps<CacheFlowNode>) {
  return (
    <BaseNode title={data.label} icon="⚡" tone="cache">
      <div>Hit ratio: {Math.round(data.hitRatio * 100)}%</div>
      <div>Latency: {data.hitLatencyMs}ms</div>
    </BaseNode>
  );
}
