# digital-twin

Agentic portfolio system — a Digital Twin that represents your professional profile through conversational AI.

Built with Next.js (App Router), LangGraph.js, Google Vertex AI (Gemini 1.5 Flash), and Supabase (pgvector + checkpointing).

## Architecture

```
src/
├── app/                    # Next.js App Router (RSC by default)
│   ├── api/chat/           # POST route — Zod-validated chat endpoint
│   ├── actions.ts          # Server Actions (alternative to API route)
│   ├── layout.tsx          # Root layout (dark mode, Geist font)
│   └── page.tsx            # Home — chat interface
├── components/
│   ├── ai/                 # Generative UI components
│   │   ├── project-card    # GitHub repo card (streamable)
│   │   ├── tech-radar      # Skills visualization
│   │   └── thinking-log    # Agent reasoning trace
│   └── chat.tsx            # Chat interface
├── lib/
│   ├── agents/             # LangGraph core
│   │   ├── state.ts        # AgentState (Annotation API)
│   │   └── graph.ts        # StateGraph: Router → Researcher → Editor
│   ├── mcp/                # MCP-pattern tool implementations
│   │   ├── tools/
│   │   │   ├── search-resume.ts   # pgvector semantic search
│   │   │   └── fetch-github.ts    # Octokit live repo stats
│   │   └── registry.ts     # Tool discovery & execution
│   ├── supabase/           # Supabase clients + checkpoint saver
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Service-role client
│   │   ├── saver.ts        # SupabaseSaver (LangGraph checkpointing)
│   │   └── migrations/     # SQL schema
│   └── observability/
│       └── logger.ts       # Structured JSON logging (LangSmith-compatible)
└── scripts/
    ├── ingest.ts           # PDF resume → chunked rows in Supabase
    └── evals.ts            # Faithfulness evaluation harness
```

## Graph Topology

```
__start__ → Router → Researcher → Editor → __end__
                 │         │
                 │         └→ Fallback → __end__
                 └→ Editor → __end__
```

- **Router** — classifies intent, decides if research is needed
- **Researcher** — calls tools (`search_resume`, `fetch_github`), gathers context
- **Editor** — synthesizes a grounded response from context
- **Fallback** — graceful degradation when tools fail or return empty

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in:
- `GOOGLE_CLOUD_PROJECT` and `GOOGLE_APPLICATION_CREDENTIALS` (Vertex AI)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_TOKEN` and `GITHUB_USERNAME`

### 3. Database

Run the migration in your Supabase SQL Editor:

```bash
# Or paste the contents of:
src/lib/supabase/migrations/001_initial.sql
```

### 4. Ingest Resume

```bash
mkdir -p data
# Place your resume at data/resume.pdf
npm run ingest
```

### 5. Run

```bash
npm run dev
```

### 6. Evaluate

```bash
npm run evals
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| LangGraph over raw chains | Durable execution, conditional edges, fallback handling |
| Supabase over Pinecone | Unified persistence (pgvector + checkpoints + auth) |
| MCP tool pattern | Modular, discoverable tools with schema-first descriptors |
| Zod on all Server Actions | Defense-in-depth input validation at the boundary |
| Structured logging | LangSmith/Vertex Tracing compatible from day one |

## License

Private — not for redistribution.
