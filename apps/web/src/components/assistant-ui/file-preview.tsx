import type { FileMessagePartProps } from "@assistant-ui/react";
import { useMemo } from "react";

const MAX_PREVIEW_CHARS = 3200;

const decodeBase64 = (value?: string) => {
  if (!value) return "";
  try {
    return atob(value);
  } catch {
    return value;
  }
};

const truncate = (value: string) =>
  value.length > MAX_PREVIEW_CHARS
    ? `${value.slice(0, MAX_PREVIEW_CHARS)}\n...`
    : value;

export function FilePreview({ filename, mimeType, data }: FileMessagePartProps) {
  const preview = useMemo(() => {
    if (!data) return "";
    return truncate(decodeBase64(data));
  }, [data]);

  return (
    <div className="rounded-2xl border border-black/5 bg-white/90 p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/50">
        <span>File Preview</span>
        {filename && <span className="rounded-full bg-ink/5 px-2 py-1">{filename}</span>}
        {mimeType && <span className="rounded-full bg-ink/5 px-2 py-1">{mimeType}</span>}
      </div>
      <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-ink/5 p-3 text-xs text-ink/80">
        {preview || "(empty file)"}
      </pre>
    </div>
  );
}
