import { BaseNode } from "./BaseNode";
import { NodeProps } from "@xyflow/react";
import { ClientFlowNode } from "@/types/canvas";


export function ClientNode({ data }: NodeProps<ClientFlowNode>) {
  return (
    <BaseNode title="Client" icon="🌐" tone="client">
      <div> RPS: {data.rps}</div>
      <div>Read mix: {Math.round(data.readRatio * 100)}%</div>
    </BaseNode>
  );
}
