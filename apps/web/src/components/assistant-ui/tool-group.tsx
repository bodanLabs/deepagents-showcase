import type { PropsWithChildren } from "react";

export function ToolGroup({ children, startIndex, endIndex }: PropsWithChildren<{ startIndex: number; endIndex: number }>) {
  const count = endIndex - startIndex + 1;
  return (
    <details className="rounded-2xl border border-black/5 bg-ink/5">
      <summary className="cursor-pointer px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink/50">
        {count} tool call{count === 1 ? "" : "s"}
      </summary>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </details>
  );
}
