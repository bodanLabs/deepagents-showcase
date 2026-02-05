from __future__ import annotations

import json
from typing import Any, AsyncIterator

from fastapi import HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage

from app.core.config import Settings
from app.schemas.chat import ChatRequest
from app.services.agent import get_agent


def ensure_settings(settings: Settings) -> None:
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")


def ensure_payload(payload: ChatRequest) -> None:
    if not payload.messages:
        raise HTTPException(status_code=400, detail="messages are required")


def _to_langchain_messages(request: ChatRequest) -> list[dict]:
    return [{"role": message.role, "content": message.content} for message in request.messages]


def _text_from_content(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(str(item.get("text", "")))
        return "".join(parts)
    return ""


def _extract_messages_from_obj(obj: object) -> list[BaseMessage]:
    messages: list[BaseMessage] = []
    if isinstance(obj, BaseMessage):
        return [obj]
    if isinstance(obj, dict):
        for value in obj.values():
            messages.extend(_extract_messages_from_obj(value))
        return messages
    if isinstance(obj, (list, tuple)):
        for item in obj:
            messages.extend(_extract_messages_from_obj(item))
    return messages


def _is_chunk(message: BaseMessage) -> bool:
    return message.__class__.__name__.endswith("Chunk")


def _append_delta(buffer: dict[str, str], key: str, content: str, is_chunk: bool) -> str | None:
    if not content:
        return None
    current = buffer.get(key, "")
    if content.startswith(current):
        delta = content[len(current) :]
        if delta:
            buffer[key] = content
            return delta
        return None
    if is_chunk:
        buffer[key] = current + content
        return content
    if content != current:
        buffer[key] = content
        return content
    return None


def _extract_text_events(message: BaseMessage, buffer: dict[str, str]) -> list[dict[str, Any]]:
    content = getattr(message, "content", "")
    is_chunk = _is_chunk(message)
    events: list[dict[str, Any]] = []

    if isinstance(content, list):
        for item in content:
            if not isinstance(item, dict):
                continue
            part_type = item.get("type")
            part_text = str(item.get("text", ""))
            if part_type == "reasoning":
                delta = _append_delta(buffer, "reasoning", part_text, is_chunk)
                if delta:
                    events.append({"type": "reasoning.delta", "delta": delta})
            elif part_type == "text":
                delta = _append_delta(buffer, "text", part_text, is_chunk)
                if delta:
                    events.append({"type": "text.delta", "delta": delta})
        return events

    if isinstance(content, str):
        delta = _append_delta(buffer, "text", content, is_chunk)
        if delta:
            events.append({"type": "text.delta", "delta": delta})
    return events


def _normalize_tool_calls(message: BaseMessage) -> list[dict[str, Any]]:
    tool_calls = getattr(message, "tool_calls", None)
    if tool_calls is None:
        tool_calls = getattr(message, "additional_kwargs", {}).get("tool_calls")
    if not tool_calls:
        return []

    normalized: list[dict[str, Any]] = []
    for call in tool_calls:
        if isinstance(call, dict):
            tool_call_id = call.get("id") or call.get("tool_call_id")
            name = call.get("name")
            args = call.get("args")
            args_text = call.get("args_text")

            function = call.get("function")
            if isinstance(function, dict):
                name = name or function.get("name")
                args_text = args_text or function.get("arguments")
        else:
            tool_call_id = getattr(call, "id", None) or getattr(call, "tool_call_id", None)
            name = getattr(call, "name", None) or getattr(call, "tool_name", None)
            args = getattr(call, "args", None)
            args_text = getattr(call, "args_text", None)

        if args is None and isinstance(args_text, str):
            try:
                args = json.loads(args_text)
            except json.JSONDecodeError:
                args = {"raw": args_text}

        if args_text is None:
            try:
                args_text = json.dumps(args or {}, ensure_ascii=False)
            except TypeError:
                args_text = str(args)

        normalized.append(
            {
                "toolCallId": tool_call_id or f"tool-{len(normalized)}",
                "toolName": name or "tool",
                "args": args or {},
                "argsText": args_text or "",
            }
        )
    return normalized


def _parse_tool_result(message: ToolMessage) -> dict[str, Any]:
    content = getattr(message, "content", None)
    result: Any = content
    if isinstance(content, str):
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            result = content
    return {
        "toolCallId": getattr(message, "tool_call_id", None) or "tool",
        "result": result,
        "isError": False,
    }


async def generate_response(payload: ChatRequest, settings: Settings) -> str:
    ensure_settings(settings)
    ensure_payload(payload)
    agent = get_agent(settings)
    messages = _to_langchain_messages(payload)

    result = await run_in_threadpool(agent.invoke, {"messages": messages})

    if isinstance(result, dict) and result.get("messages"):
        last = result["messages"][-1]
        return _text_from_content(getattr(last, "content", ""))

    return str(result)


async def stream_response(
    payload: ChatRequest,
    settings: Settings,
    request: Request,
) -> AsyncIterator[dict[str, Any]]:
    ensure_settings(settings)
    ensure_payload(payload)
    agent = get_agent(settings)
    messages = _to_langchain_messages(payload)
    seen_tool_calls: set[str] = set()
    buffers = {"text": "", "reasoning": ""}

    async for chunk in agent.astream(
        {"messages": messages},
        stream_mode=["messages", "updates"],
    ):
        if await request.is_disconnected():
            break

        for message in _extract_messages_from_obj(chunk):
            if isinstance(message, AIMessage):
                for tool_call in _normalize_tool_calls(message):
                    tool_call_id = tool_call["toolCallId"]
                    if tool_call_id in seen_tool_calls:
                        continue
                    seen_tool_calls.add(tool_call_id)
                    yield {
                        "type": "tool.start",
                        "toolCallId": tool_call_id,
                        "toolName": tool_call["toolName"],
                        "args": tool_call["args"],
                        "argsText": tool_call["argsText"],
                    }
            if isinstance(message, ToolMessage):
                tool_result = _parse_tool_result(message)
                artifact = None
                if isinstance(tool_result["result"], dict):
                    artifact = tool_result["result"].get("artifact")
                yield {
                    "type": "tool.result",
                    "toolCallId": tool_result["toolCallId"],
                    "result": tool_result["result"],
                    "isError": tool_result["isError"],
                    "artifact": artifact,
                }
                if isinstance(artifact, dict) and artifact.get("dataBase64"):
                    yield {
                        "type": "file",
                        "filename": artifact.get("filename"),
                        "mimeType": artifact.get("mimeType"),
                        "dataBase64": artifact.get("dataBase64"),
                    }
                continue

            for event in _extract_text_events(message, buffers):
                yield event
