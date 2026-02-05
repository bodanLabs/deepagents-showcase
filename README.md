# Deep Agents Showcase

A full-stack chat application that showcases **LangChain Deep Agents** with a FastAPI backend and a React frontend built with [assistant-ui](https://assistant-ui.com/). The backend streams responses over SSE; the frontend provides a chat UI with tool calls, reasoning, and file previews.

## What's in this repo

- **`apps/api`** — FastAPI service that runs a Deep Agent (OpenAI), exposes `/api/chat` and `/api/chat/stream`, and streams via Server-Sent Events.
- **`apps/web`** — Vite + React app using assistant-ui’s LocalRuntime and a custom streaming adapter for the API.

## Tech stack

| Layer   | Stack |
|--------|--------|
| Backend | Python 3.11+, FastAPI, LangChain, Deep Agents, OpenAI |
| Frontend | React 18, Vite 7, TypeScript, Tailwind CSS, assistant-ui |
| Tooling | pnpm (workspace), uv (Python), Docker Compose |

## Prerequisites

- **Python 3.11+** (and [uv](https://docs.astral.sh/uv/) recommended)
- **Node.js 20+**
- **pnpm** (`npm install -g pnpm`)
- **OpenAI API key** (for the agent)

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/bodanLabs/deepagents-showcase.git
cd deepagents-showcase
```

### 2. Backend (API)

```bash
cd apps/api
```

Create environment file from the example and add your OpenAI key:

```bash
cp .env.example .env
```

Edit `apps/api/.env` and set at least:

- `OPENAI_API_KEY` — your OpenAI API key (required)
- `OPENAI_MODEL` — e.g. `openai:gpt-4o-mini` (optional, has default)
- `CORS_ORIGINS` — e.g. `http://localhost:5173` for local web dev

Create a virtual environment and install the API:

```bash
uv venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
```

Run the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be at **http://localhost:8000**. Health check: [http://localhost:8000/health](http://localhost:8000/health).

### 3. Frontend (Web)

In a new terminal, from the repo root:

```bash
pnpm install
pnpm dev:web
```

Or from the web app directory:

```bash
cd apps/web
pnpm install
pnpm dev
```

App will be at **http://localhost:5173**. Ensure the API is running and that `CORS_ORIGINS` in `apps/api/.env` includes `http://localhost:5173`.

Optional: copy `apps/web/.env.example` to `apps/web/.env` if you need to change the API URL (e.g. for a different host/port).

---

## Running with Docker

From the repo root, create `apps/api/.env` as above (Docker Compose uses it), then:

```bash
docker-compose up --build
```

- **API**: http://localhost:8000  
- **Web**: http://localhost:5173  

The web container is built with the API URL pointing at the API service.

## Environment variables

### Backend (`apps/api/.env`)

| Variable        | Description                    | Example                    |
|----------------|--------------------------------|----------------------------|
| `OPENAI_API_KEY` | OpenAI API key (required)      | `sk-...`                   |
| `OPENAI_MODEL`   | Model used by the agent       | `openai:gpt-4o-mini`       |
| `CORS_ORIGINS`   | Allowed origins (comma-separated) | `http://localhost:5173` |
| `LOG_LEVEL`      | Logging level                  | `INFO`                     |

### Frontend (`apps/web/.env`)

Optional. Use if the API is not at `http://localhost:8000` (e.g. different port or host). See `apps/web/.env.example`.

## Project structure

```
deepagents-showcase/
├── apps/
│   ├── api/                 # FastAPI + Deep Agents
│   │   ├── app/
│   │   │   ├── core/        # config, logging
│   │   │   ├── schemas/     # request/response models
│   │   │   └── services/    # chat, agent
│   │   ├── tests/
│   │   ├── .env.example
│   │   └── pyproject.toml
│   └── web/                 # Vite + React + assistant-ui
│       ├── src/
│       │   ├── components/  # assistant-ui components
│       │   ├── lib/         # SSE/streaming adapter
│       │   └── runtime/     # LocalRuntimeProvider
│       ├── .env.example
│       └── package.json
├── docker-compose.yml
├── package.json             # pnpm workspace root
└── README.md
```

