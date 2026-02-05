import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { useMemo } from "react";

const MAX_PREVIEW_CHARS = 2400;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const formatValue = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const truncate = (value: string) =>
  value.length > MAX_PREVIEW_CHARS
    ? `${value.slice(0, MAX_PREVIEW_CHARS)}\n...`
    : value;

const decodeBase64 = (value?: string) => {
  if (!value) return "";
  try {
    return atob(value);
  } catch {
    return value;
  }
};

export function ToolCallCard(props: ToolCallMessagePartProps) {
  const status = props.isError
    ? "error"
    : props.status?.type ?? (props.result ? "complete" : "running");
  const artifact = isRecord(props.artifact) ? props.artifact : null;
  const artifactPreview = useMemo(() => {
    if (!artifact) return null;
    const data = artifact.dataBase64 as string | undefined;
    if (!data) return null;
    const decoded = decodeBase64(data);
    return truncate(decoded);
  }, [artifact]);

  const argsText = props.argsText || formatValue(props.args);
  const resultText = props.result ? formatValue(props.result) : "";

  return (
    <details className="rounded-2xl border border-black/5 bg-white/90 shadow-sm">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink/80">
        <span className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-tide" />
          Tool: {props.toolName ?? "tool"}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-ink/50">
          {status}
        </span>
      </summary>
      <div className="space-y-4 border-t border-black/5 px-4 py-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Args
          </p>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-ink/5 p-3 text-xs text-ink/80">
            {truncate(argsText)}
          </pre>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Result
          </p>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-ink/5 p-3 text-xs text-ink/80">
            {resultText ? truncate(resultText) : "Waiting for tool output..."}
          </pre>
        </div>
        {artifactPreview && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
              Artifact Preview
            </p>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-ink/5 p-3 text-xs text-ink/80">
              {artifactPreview}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}
