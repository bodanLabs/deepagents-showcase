import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test")
    from app.core import config

    config.get_settings.cache_clear()
    from app import main

    importlib.reload(main)
    return TestClient(main.app)
