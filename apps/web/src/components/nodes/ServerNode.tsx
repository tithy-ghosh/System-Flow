import { BaseNode } from "./BaseNode";

export function ServerNode() {
  return (
    <BaseNode title="App Server" icon="🖥️" tone="server">
      <div>Workers: 4</div>
      <div> Service: 10ms</div>
    </BaseNode>
  );
}
