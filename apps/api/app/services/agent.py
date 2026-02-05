from __future__ import annotations

import base64
import json
import os
from datetime import datetime, timezone

from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model

from app.core.config import Settings

SYSTEM_PROMPT = (
    "You are a helpful assistant in a demo app. "
    "Keep responses concise and practical. "
    "Use the get_current_time tool when the user asks about time. "
    "If the user asks for a report or summary, use the generate_report tool."
)


def get_current_time() -> str:
    """Return the current UTC time in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat()


def generate_report(topic: str = "General", highlights: int = 3) -> dict:
    """Generate a small structured report with an attached JSON artifact."""
    topic_title = topic.strip() or "General"
    highlights_count = max(1, min(highlights, 5))
    report = {
        "title": f"{topic_title} Report",
        "summary": f"A short report on {topic_title}.",
        "highlights": [
            f"Key point {idx + 1} about {topic_title}."
            for idx in range(highlights_count)
        ],
        "metrics": {
            "confidence": 0.82,
            "items": highlights_count,
        },
    }
    report_json = json.dumps(report, indent=2)
    artifact = {
        "filename": f"{topic_title.lower().replace(' ', '-')}-report.json",
        "mimeType": "application/json",
        "dataBase64": base64.b64encode(report_json.encode("utf-8")).decode("utf-8"),
    }
    return {
        "summary": report["summary"],
        "report": report,
        "artifact": artifact,
    }


_cached_agent = None
_cached_signature: tuple[str | None, str | None] | None = None


def get_agent(settings: Settings):
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    global _cached_agent, _cached_signature
    signature = (settings.openai_api_key, settings.openai_model)

    if _cached_agent is None or _cached_signature != signature:
        os.environ["OPENAI_API_KEY"] = settings.openai_api_key
        model = init_chat_model(settings.openai_model)
        _cached_agent = create_deep_agent(
            tools=[get_current_time, generate_report],
            system_prompt=SYSTEM_PROMPT,
            model=model,
        )
        _cached_signature = signature

    return _cached_agent
