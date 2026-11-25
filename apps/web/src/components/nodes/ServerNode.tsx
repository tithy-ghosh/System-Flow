import { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { ServerFlowNode } from "@/types/canvas";

export function ServerNode({ data }: NodeProps<ServerFlowNode>) {
  return (
    <BaseNode title={data.label} icon="🖥️" tone="server">
      <div>Workers: {data.workers}</div>
      <div>Service: {data.meanServiceTime}ms</div>
    </BaseNode>
  );
}
