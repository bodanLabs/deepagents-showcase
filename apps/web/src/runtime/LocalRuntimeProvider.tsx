import type { PropsWithChildren } from "react";
import {
  AssistantRuntimeProvider,
  ChatModelAdapter,
  ThreadListItemRuntimeProvider,
  useLocalRuntime,
} from "@assistant-ui/react";
import type {
  ThreadAssistantMessagePart,
  ToolCallMessagePart,
} from "@assistant-ui/react";

import { readSseJson } from "../lib/sse";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const adapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const payload = {
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content
          .map((part) => (part.type === "text" ? part.text : ""))
          .join(""),
      })),
    };

    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: abortSignal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`API error (${response.status})`);
    }

    const parts: ThreadAssistantMessagePart[] = [];
    const toolCallIndex = new Map<string, number>();
    let textIndex: number | null = null;
    let reasoningIndex: number | null = null;

    const emit = () => ({
      content: [...parts],
    });

    for await (const rawEvent of readSseJson(response)) {
      const event = rawEvent ?? {};
      const type = event.type ?? (event.delta ? "text.delta" : null);

      if (type === "error") {
        throw new Error(event.message ?? "stream_failed");
      }

      if (type === "text.delta") {
        const delta = String(event.delta ?? "");
        if (!delta) continue;
        if (textIndex === null) {
          textIndex = parts.length;
          parts.push({ type: "text", text: delta });
        } else {
          const current = parts[textIndex] as ThreadAssistantMessagePart & {
            text?: string;
          };
          parts[textIndex] = {
            ...current,
            type: "text",
            text: `${current.text ?? ""}${delta}`,
          };
        }
        yield emit();
      }

      if (type === "reasoning.delta") {
        const delta = String(event.delta ?? "");
        if (!delta) continue;
        if (reasoningIndex === null) {
          reasoningIndex = parts.length;
          parts.push({ type: "reasoning", text: delta });
        } else {
          const current = parts[reasoningIndex] as ThreadAssistantMessagePart & {
            text?: string;
          };
          parts[reasoningIndex] = {
            ...current,
            type: "reasoning",
            text: `${current.text ?? ""}${delta}`,
          };
        }
        yield emit();
      }

      if (type === "tool.start") {
        const toolCallId = String(event.toolCallId ?? "");
        if (!toolCallId) continue;
        const part: ToolCallMessagePart = {
          type: "tool-call",
          toolCallId,
          toolName: String(event.toolName ?? "tool"),
          args: event.args ?? {},
          argsText:
            event.argsText ?? JSON.stringify(event.args ?? {}, null, 2),
        };
        toolCallIndex.set(toolCallId, parts.length);
        parts.push(part);
        yield emit();
      }

      if (type === "tool.result") {
        const toolCallId = String(event.toolCallId ?? "");
        if (!toolCallId) continue;
        const index = toolCallIndex.get(toolCallId);
        const updated: ToolCallMessagePart = {
          type: "tool-call",
          toolCallId,
          toolName: String(event.toolName ?? "tool"),
          args: event.args ?? {},
          argsText:
            event.argsText ?? JSON.stringify(event.args ?? {}, null, 2),
          result: event.result,
          isError: event.isError ?? false,
          artifact: event.artifact,
        };
        if (index === undefined) {
          toolCallIndex.set(toolCallId, parts.length);
          parts.push(updated);
        } else {
          const existing = parts[index] as ToolCallMessagePart;
          parts[index] = {
            ...existing,
            ...updated,
            toolName: existing.toolName ?? updated.toolName,
            args: existing.args ?? updated.args,
            argsText: existing.argsText ?? updated.argsText,
          };
        }
        yield emit();
      }

      if (type === "file") {
        parts.push({
          type: "file",
          filename: event.filename,
          mimeType: event.mimeType ?? "application/octet-stream",
          data: event.dataBase64 ?? "",
        });
        yield emit();
      }

      if (type === "done") {
        yield {
          content: [...parts],
          status: { type: "complete", reason: "stop" },
        };
        return;
      }
    }
  },
};

export function LocalRuntimeProvider({ children }: PropsWithChildren) {
  const runtime = useLocalRuntime(adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadListItemRuntimeProvider runtime={runtime.threads.mainItem}>
        {children}
      </ThreadListItemRuntimeProvider>
    </AssistantRuntimeProvider>
  );
}
