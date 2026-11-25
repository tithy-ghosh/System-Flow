import { BaseNode } from "./BaseNode";

export function LoadBalancerNode() {
  return (
    <BaseNode title="Load Balancer" icon="⚖️" tone="load-balancer">
      <div>Algorithm: Round Robin</div>
    </BaseNode>
  );
}
