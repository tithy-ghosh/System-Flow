import { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { LoadBalancerFlowNode } from "@/types/canvas";

const algorithmLabels = {
  "round-robin": "Round Robin",
  random: "Random",
} as const;

export function LoadBalancerNode({ data }: NodeProps<LoadBalancerFlowNode>) {
  return (
    <BaseNode title={data.label} icon="⚖️" tone="load-balancer">
      <div>Algorithm: {algorithmLabels[data.algorithm]}</div>
    </BaseNode>
  );
}
