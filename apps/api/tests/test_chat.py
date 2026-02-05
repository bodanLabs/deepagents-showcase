from app.core.config import Settings
from app.services import chat_service


def test_chat_endpoint(client, monkeypatch):
    async def fake_generate_response(payload, settings):
        return "hello"

    monkeypatch.setattr(chat_service, "generate_response", fake_generate_response)

    response = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Hi"}]},
    )

    assert response.status_code == 200
    assert response.json()["text"] == "hello"


def test_chat_stream_endpoint(client, monkeypatch):
    async def fake_stream_response(payload, settings, request):
        yield {"type": "text.delta", "delta": "hi"}
        yield {"type": "text.delta", "delta": " there"}

    monkeypatch.setattr(chat_service, "stream_response", fake_stream_response)

    with client.stream(
        "POST",
        "/api/chat/stream",
        json={"messages": [{"role": "user", "content": "Hi"}]},
    ) as response:
        assert response.status_code == 200
        body = "".join(list(response.iter_text()))

    assert "\"type\": \"text.delta\"" in body
    assert "\"delta\": \"hi\"" in body
    assert "\"delta\": \" there\"" in body
    assert "\"type\": \"done\"" in body


def test_missing_api_key_raises():
    settings = Settings(openai_api_key=None)
    try:
        chat_service.ensure_settings(settings)
    except Exception as exc:
        assert "OPENAI_API_KEY" in str(exc)
    else:
        raise AssertionError("Expected missing key error")
