# Veritas RAG-Eval

> **Enterprise Hybrid Retrieval, Real-Time Citation Attribution & Continuous Evaluation Engine**  
> *Engineered & Maintained by **[Anamika Thakur](https://github.com/Anamika-Thakur)***

[![GitHub Repository](https://img.shields.io/badge/GitHub-Anamika--Thakur%2FRAG--Eval-181717?logo=github&style=flat-square)](https://github.com/Anamika-Thakur/RAG-Eval)
[![License: MIT](https://img.shields.io/badge/License-MIT-3b82f6?style=flat-square)](LICENSE)
[![Python Version](https://img.shields.io/badge/Python-3.11+-3776ab?logo=python&logoColor=white&style=flat-square)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white&style=flat-square)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL%2016-pgvector%20HNSW-336791?logo=postgresql&logoColor=white&style=flat-square)](https://github.com/pgvector/pgvector)
[![Next.js](https://img.shields.io/badge/Next.js%2014-Tailwind%20%2B%20TypeScript-000000?logo=next.js&style=flat-square)](https://nextjs.org/)

---

## Executive Summary

Standard Retrieval-Augmented Generation (RAG) pipelines in production commonly suffer from two fundamental failure modes: **hallucinated synthesis** (where models invent unsupported assertions when source documents are partially relevant) and **silent metric degradation** (where prompt tweaks or chunking updates drift retrieval quality without visibility).

**Veritas RAG-Eval** is a production-hardened platform built to address these challenges over dense technical and scientific literature (arXiv corpus). It integrates:

1. **Dual-Path Hybrid Retrieval**: Blends exact keyword BM25 retrieval via Postgres GIN indexes with high-dimensional vector similarity (`text-embedding-3-small` in HNSW pgvector) using **Reciprocal Rank Fusion (RRF)**.
2. **Confidence-Gated Cross-Encoder Reranking**: Re-scores top fused candidates with sentence-transformers `ms-marco-MiniLM-L-6-v2`, dynamically bypassing the reranker when top-k score entropy is sufficiently low.
3. **Citation-Enforced Streaming Generation**: Delivers server-sent event (SSE) token streams with inline `[Sₙ]` citation markers linked directly to immutable document chunks.
4. **Real-Time Entailment Verification**: An independent LLM judge inspects each cited assertion for natural language entailment; low-grounding completions automatically trigger widened-window retries before delivery.
5. **Continuous Evaluation Suite**: An automated evaluation harness benchmarked against curated test sets, computing Precision@K, Recall@K, Mean Reciprocal Rank (MRR), and RAGAS metrics tracked against individual git commit SHAs.

---

## System Architecture

```mermaid
flowchart TD
    classDef client fill:#1e1b4b,stroke:#818cf8,stroke-width:1px,color:#fff;
    classDef storage fill:#064e3b,stroke:#34d399,stroke-width:1px,color:#fff;
    classDef compute fill:#3b0764,stroke:#c084fc,stroke-width:1px,color:#fff;
    classDef eval fill:#701a75,stroke:#f472b6,stroke-width:1px,color:#fff;

    subgraph Offline_Ingest ["Data Ingestion & Indexing"]
        A[arXiv Scientific Papers] --> B[pypdf Text Extraction]
        B --> C[Sentence-Boundary Chunker]
        C --> D[OpenAI Embedding Generator]
        D --> E[(Postgres 16 DB)]:::storage
    end

    subgraph Online_Inference ["Real-Time Query Pipeline"]
        UserQuery([User Question]):::client --> APIGateway[FastAPI Async Endpoint]
        APIGateway --> P1[BM25 Lexical Search GIN]
        APIGateway --> P2[Cosine Vector Search HNSW]
        E --> P1
        E --> P2
        P1 --> Fusion[Reciprocal Rank Fusion k=60]:::compute
        P2 --> Fusion
        Fusion --> Gate{RRF Dispersal Gate}
        Gate -- Dispersed --> Rerank[Cross-Encoder MiniLM]:::compute
        Gate -- High Confidence --> GenPrompt[Context Prompt Assembly]
        Rerank --> GenPrompt
        GenPrompt --> LLM[Claude Sonnet Streaming]:::compute
        LLM --> TokenStream[SSE Token Stream + Citations]:::client
        TokenStream --> Verifier[LLM Entailment Judge]:::compute
        Verifier -- Grounded >= 0.70 --> ClientUI[Veritas Interactive UI]:::client
        Verifier -- Grounded < 0.70 --> Fallback[Widened Retrieval Fallback]
    end

    subgraph Continuous_Eval ["Regression Testing & Metrics"]
        TestCorpus[Curated Test Suite JSONL] --> Harness[Eval Benchmark Runner]:::eval
        Harness --> MetricEngine[P@5, R@5, MRR, Faithfulness, RAGAS]:::eval
        MetricEngine --> RunLog[(eval_runs Record + Git SHA)]:::storage
        RunLog --> Dashboard[Eval Analytics Dashboard]:::client
    end
```

---

## Technical Deep-Dive

### 1. Hybrid Retrieval Mechanics
- **Lexical Stream (Sparse)**: Utilizes PostgreSQL's native `tsvector` and `ts_rank_cd` indexed by Generalized Inverted Indexes (GIN). This guarantees instantaneous recall for rare domain entities, mathematical notations, paper acronyms, and alphanumeric identifiers.
- **Dense Vector Stream**: Utilizes `pgvector` with Hierarchical Navigable Small World (HNSW) graph indexing over 1536-dimensional embeddings, handling conversational phrasing, conceptual abstraction, and synonymy.
- **Reciprocal Rank Fusion**: Rather than fragile manual score-weight calibrations, rank lists $R$ from both retrievers are merged via:
  $$\text{RRF\_Score}(d) = \sum_{r \in R} \frac{1}{k + \text{rank}_r(d)} \quad (k = 60)$$
  This ensures documents excelling in either domain surface rapidly while dual-validated documents dominate the ranking.

### 2. Sentence-Level Source Attribution
- Generations enforce citation markers (`[S1]`, `[S2]`) directly through token streams.
- A post-generation verification parser cross-references emitted citation indices against the active chunk context. Any ungrounded or hallucinated marker index immediately fails verification.
- A secondary evaluation pass at temperature 0 evaluates claim entailment:
  $$\text{Faithfulness} = \frac{\sum_{i=1}^{N} \mathbb{I}(\text{Claim}_i \models \text{Source}_{\text{cited}})}{N}$$

### 3. Continuous Eval Harness & Git Attribution
- Every benchmark run is versioned against the exact git commit SHA, recording hyperparameter configurations (chunk sizes, overlap, fusion constants, model checkpoints).
- Tracks regressions over time:
  - **Precision@5**: Proportion of top-5 retrieved chunks matching target paper.
  - **Recall@5**: Coverage of necessary source chunks in top-5 results.
  - **MRR (Mean Reciprocal Rank)**: Position of first relevant ground-truth chunk.
  - **Mean Claim Entailment**: Percentage of claims confirmed by source text.

---

## Repository Structure

```
.
├── backend/                        # FastAPI asynchronous application
│   ├── src/rag/
│   │   ├── api/                    # HTTP & SSE endpoints (chat, search, eval, health)
│   │   ├── core/                   # Configuration, structured logging, client initializers
│   │   ├── eval/                   # Metric calculators, RAGAS bridge, test set runner
│   │   ├── generation/             # Prompt templates, citation parsers, entailment judge
│   │   ├── ingestion/              # arXiv fetcher, sentence chunker, embedding pipeline
│   │   ├── retrieval/              # BM25 GIN adapter, pgvector HNSW, RRF combiner, reranker
│   │   ├── models.py               # SQLAlchemy async ORM definitions
│   │   └── main.py                 # FastAPI application factory & middleware
│   ├── alembic/                    # Database schema migrations
│   ├── tests/                      # Pytest unit & integration suites
│   ├── scripts/                    # Ingestion & evaluation CLI scripts
│   └── pyproject.toml              # Dependencies and tooling configuration
├── frontend/                       # Next.js 14 Web Application
│   ├── app/                        # App router (Lab, Library, History, Eval, Settings)
│   ├── components/                 # UI components (Chat, Sources, Meter, Charts, Shell)
│   ├── lib/                        # SSE client & API communication utilities
│   └── public/                     # Icons, vectors, and static assets
├── docs/                           # Architecture specifications & benchmark writeups
├── eval/                           # Test questions & evaluation result caches
├── docker-compose.yml              # Container orchestration for all services
└── Makefile                        # Operational command shortcuts
```

---

## Quickstart Guide

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- API Keys: Anthropic (`ANTHROPIC_API_KEY`) and OpenAI (`OPENAI_API_KEY`)

### 1. Clone & Configure
```bash
git clone https://github.com/Anamika-Thakur/RAG-Eval.git
cd RAG-Eval
cp .env.example .env
```
Open `.env` and insert your API credentials:
```ini
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
```

### 2. Launch Services
Spin up Postgres (with pgvector), the FastAPI backend, and the Next.js frontend:
```bash
docker compose up -d --build
```

### 3. Initialize Database & Seed Corpus
Run Alembic schema migrations and seed initial literature papers:
```bash
# Run schema migrations
docker compose exec backend alembic upgrade head

# Seed arXiv technical papers & compute vector embeddings
docker compose exec backend python -m scripts.seed_fake

# Execute initial evaluation benchmark
docker compose exec backend python -m scripts.run_eval
```

### 4. Access the Application
- **Interactive Research Lab (Frontend)**: [http://localhost:3000](http://localhost:3000)
- **Evaluation Analytics Dashboard**: [http://localhost:3000/eval](http://localhost:3000/eval)
- **Interactive OpenAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Make Command Reference

A comprehensive [Makefile](Makefile) is provided for common development and maintenance tasks:

| Command | Action |
|:---|:---|
| `make up` | Start PostgreSQL, backend API, and frontend containers |
| `make down` | Gracefully stop all active containers |
| `make logs` | Tail logs across all services in real time |
| `make migrate` | Execute pending Alembic database migrations |
| `make ingest` | Run offline pipeline to fetch and vectorize arXiv papers |
| `make eval` | Execute the full test-set evaluation benchmark |
| `make test` | Run backend unit and integration tests via `pytest` |
| `make lint` | Verify code quality with `ruff` and `mypy` |
| `make format` | Automatically format code with `ruff format` |
| `make clean` | Stop and purge all containers, networks, and persistent database volumes |

---

## API Overview

### `POST /chat`
Streams citation-grounded completions via Server-Sent Events (SSE).
```bash
curl -N -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "How does reciprocal rank fusion combine search results?", "top_k": 5}'
```

**SSE Event Flow:**
1. `event: sources` — Emits array of retrieved and reranked paper chunks.
2. `event: token` — Emits incremental generation tokens from Claude.
3. `event: citations` — Emits mapping between `[Sₙ]` tokens and specific chunk IDs.
4. `event: grounding` — Emits entailment scores and verification verdict per assertion.
5. `event: done` — Emits total execution latency and token analytics.

### `POST /search`
Direct retrieval endpoint returning ranked chunks with sparse, dense, and RRF scores.

### `POST /eval/run`
Triggers an automated benchmark evaluation run, persisting results to `eval_runs`.

---

## Testing & Quality Assurance

Run the test suite inside the backend container or locally:
```bash
# Run pytest with strict markers
docker compose exec backend pytest -v

# Run type checker and linter
docker compose exec backend ruff check src tests scripts
docker compose exec backend mypy src
```

---

## Author & Contact

**Anamika Thakur**  
AI & Machine Learning Engineer specializing in LLM architectures, production RAG pipelines, vector search infrastructure, and automated evaluation frameworks.

- **GitHub**: [@Anamika-Thakur](https://github.com/Anamika-Thakur)
- **Repository**: [Anamika-Thakur/RAG-Eval](https://github.com/Anamika-Thakur/RAG-Eval)

---

## License

This project is open-source and released under the terms of the [MIT License](LICENSE).  
Copyright © 2026 Anamika Thakur.
