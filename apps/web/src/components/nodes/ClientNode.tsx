import { BaseNode } from "./BaseNode";

export function ClientNode() {
  return (
    <BaseNode title="Client" icon="🌐" tone="client">
      <div> RPS: 100</div>
      <div>Read: 80%</div>
    </BaseNode>
  );
}
