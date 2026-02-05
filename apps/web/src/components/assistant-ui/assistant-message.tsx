import { MessagePrimitive } from "@assistant-ui/react";
import {
  AssistantActionBar,
  BranchPicker,
  MessagePart,
  useThreadConfig,
} from "@assistant-ui/react-ui";

import { FilePreview } from "./file-preview";
import { ReasoningBlock, ReasoningGroup } from "./reasoning";
import { ToolCallCard } from "./tool-call-card";
import { ToolGroup } from "./tool-group";

export function AssistantMessage() {
  const { assistantAvatar } = useThreadConfig();
  const fallback = assistantAvatar?.fallback ?? "A";
  const src = assistantAvatar?.src;
  const alt = assistantAvatar?.alt ?? "Assistant";

  return (
    <MessagePrimitive.Root className="aui-assistant-message-root">
      <div className="aui-avatar-root">
        {src ? (
          <img src={src} alt={alt} className="aui-avatar-image" />
        ) : (
          <div className="aui-avatar-fallback">{fallback}</div>
        )}
      </div>
      <div className="aui-assistant-message-content">
        <MessagePrimitive.Parts
          components={{
            Text: MessagePart.Text,
            Reasoning: ReasoningBlock,
            ReasoningGroup,
            File: FilePreview,
            ToolGroup,
            tools: {
              by_name: {
                generate_report: ToolCallCard,
                get_current_time: ToolCallCard,
              },
              Fallback: ToolCallCard,
            },
          }}
        />
      </div>
      <BranchPicker />
      <AssistantActionBar />
    </MessagePrimitive.Root>
  );
}
