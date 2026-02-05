import type {
  ReasoningGroupProps,
  ReasoningMessagePartProps,
} from "@assistant-ui/react";

export function ReasoningBlock({ text }: ReasoningMessagePartProps) {
  if (!text) return null;
  return (
    <div className="rounded-xl bg-ink/5 p-3 text-xs text-ink/70">
      {text}
    </div>
  );
}

export function ReasoningGroup({ children }: ReasoningGroupProps) {
  return (
    <details className="rounded-2xl border border-dashed border-ink/20 bg-white/70">
      <summary className="cursor-pointer px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink/50">
        Reasoning
      </summary>
      <div className="space-y-2 px-4 pb-4">{children}</div>
    </details>
  );
}
