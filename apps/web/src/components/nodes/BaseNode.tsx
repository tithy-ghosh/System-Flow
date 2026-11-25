import { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";

export type NodeTone = "client" | "load-balancer" | "server" | "cache" | "database";

interface BaseNodeProps {
  title: string;
  icon: string;
  tone: NodeTone;
  children?: ReactNode;
}

export function BaseNode({ title, icon, tone, children }: BaseNodeProps) {
  return (
    <div
      className="base-node border-2 rounded-lg shadow-md min-w-[180px] overflow-hidden"
      data-tone={tone}
      style={{ backgroundColor: "var(--node-soft)", borderColor: "var(--node-accent)" }}
    >
      {/* Input handle (top) */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 rounded-full" />

      {/* Header */}
      <div
        className="px-4 py-2 rounded-t-md flex items-center gap-2"
        style={{ backgroundColor: "var(--node-accent)", color: "var(--color-foreground-inverse)" }}
      >
        <span className="text-xl">{icon}</span>
        <span className="font-semibold">{title}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 text-sm text-foreground">
        {children}
      </div>

      {/* Output handle (bottom) */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 rounded-full" />
    </div>
  );
}
