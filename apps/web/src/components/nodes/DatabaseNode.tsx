import { BaseNode } from "./BaseNode";

export function DatabaseNode() {
  return (
    <BaseNode title="Database" icon="🗄️" tone="database">
      <div>Pool: 8</div>
      <div>Read: 20ms</div>
    </BaseNode>
  );
}