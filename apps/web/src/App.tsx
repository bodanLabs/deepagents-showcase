import { Thread } from "@assistant-ui/react-ui";

import { LocalRuntimeProvider } from "./runtime/LocalRuntimeProvider";
import { AssistantMessage } from "./components/assistant-ui/assistant-message";

export default function App() {
  return (
    <LocalRuntimeProvider>
      <div className="min-h-screen bg-haze text-ink">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
          <header className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-tide/80">
              Deep Agents Showcase
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
              Chat with a LangChain Deep Agent
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-ink/70">
              A production-ready demo using FastAPI, LangChain Deep Agents, and
              assistant-ui streaming responses.
            </p>
          </header>

          <main className="flex-1">
            <div className="rounded-3xl bg-white/80 p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.6)] ring-1 ring-black/5 backdrop-blur">
              <div className="h-[65vh] min-h-[520px]">
                <Thread
                  className="h-full"
                  components={{
                    AssistantMessage,
                  }}
                />
              </div>
            </div>
          </main>

          <footer className="mt-6 text-xs text-ink/50">
            Powered by LangChain Deep Agents + assistant-ui.
          </footer>
        </div>
      </div>
    </LocalRuntimeProvider>
  );
}
