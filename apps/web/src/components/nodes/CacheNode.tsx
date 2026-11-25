import { BaseNode } from "./BaseNode";

export function CacheNode() {
  return (
    <BaseNode title="Cache" icon="⚡" tone="cache">
      <div>Hit Ratio: 80%</div>
      <div>Latency: 1ms</div>
    </BaseNode>
  );
}