import { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { DatabaseFlowNode } from "@/types/canvas";

export function DatabaseNode({ data }: NodeProps<DatabaseFlowNode>) {
  return (
    <BaseNode title={data.label} icon="🗄️" tone="database">
      <div>Pool: {data.poolSize}</div>
      <div>Read: {data.readLatencyMs}ms</div>
    </BaseNode>
  );
}
