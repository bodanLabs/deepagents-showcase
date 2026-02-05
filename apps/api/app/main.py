from __future__ import annotations

import json
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import chat_service

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(title="Deep Agents API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    response_text = await chat_service.generate_response(payload, settings)
    return ChatResponse(text=response_text, thread_id=payload.thread_id)


@app.post("/api/chat/stream")
async def chat_stream(payload: ChatRequest, request: Request) -> StreamingResponse:
    chat_service.ensure_settings(settings)
    chat_service.ensure_payload(payload)

    async def event_stream():
        try:
            async for event in chat_service.stream_response(payload, settings, request):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception:
            logger.exception("streaming error")
            yield f"data: {json.dumps({'type': 'error', 'message': 'stream_failed'})}\n\n"
        finally:
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=headers)
