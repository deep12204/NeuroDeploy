# NeuroDeploy – Intelligent Repository Analyzer & Deployment Generator  

**Automatically understand, enrich, and ship any codebase** – from a single GitHub URL you get:

* 📊 **Semantic analysis** of the whole repository (AST parsing, ChromaDB embeddings)  
* 🧩 **Tech‑stack detection** (Python, Node, Java, Go, Rust, React, Next.js …) with confidence scores  
* 🤖 **ML‑driven resource estimation** (RAM, CPU, workers) for production containers  
* 🐳 **Infrastructure as code** – multi‑stage Dockerfiles, Docker‑Compose, Kubernetes snippets, CI pipelines  
* 🌐 **Full‑stack UI** built with React, styled for quick onboarding  

> **One command → a ready‑to‑deploy, production‑grade configuration.**  

---  

## Table of Contents  

1. [Features](#features)  
2. [Tech Stack](#tech-stack)  
3. [Project Structure](#project-structure)  
4. [Getting Started](#getting-started)  
5. [API Reference](#api-reference)  
6. [CLI / UI Usage](#cli--ui-usage)  
7. [Contributing](#contributing)  
8. [License](#license)  

---  

## Features  

| ✅ | Description |
|---|-------------|
| **Repository Insight** | Parses every file, builds an AST, stores semantic chunks in ChromaDB. |
| **Tech‑Stack Detection** | `detect_tech_stack()` inspects file names, config files and source content → returns stack items with icons & confidence. |
| **Resource Estimation** | `estimate_resources()` predicts RAM, CPU, and worker count based on stack & repo size. |
| **Infrastructure Generation** | Generates Dockerfile, `docker‑compose.yml`, optional Helm/K8s manifests, and CI (GitHub Actions) snippets. |
| **Interactive UI** | React SPA that walks users through analysis → generation → download. |
| **Extensible API** | FastAPI backend exposing clean JSON endpoints for automation. |
| **Multi‑language support** | Python, Node.js, Java, Go, Rust, Ruby, PHP, and many frameworks (FastAPI, Django, React, Next.js, Spring‑Boot, etc.). |
| **Docker‑Ready** | The whole service runs inside a single container for easy deployment. |

---  

## Tech Stack  

| Component | Version | Badge |
|-----------|---------|-------|
| **Backend** | Python 3.11 | ![Python](https://img.shields.io/badge/python-3.11%20|%20%F0%9F%90%8D-blue) |
| **Web framework** | FastAPI | ![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688) |
| **ML / Data** | NumPy, Pandas, PyTorch (optional) | ![ML](https://img.shields.io/badge/ML-🤖-orange) |
| **Database** | ChromaDB (vector store) | ![ChromaDB](https://img.shields.io/badge/ChromaDB-0.4.0-ff69b4) |
| **Frontend** | React 18 + Vite | ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react) |
| **Styling** | Tailwind CSS | ![Tailwind](https://img.shields.io/badge/Tailwind‑CSS-38B2AC?logo=tailwindcss) |
| **Containerisation** | Docker, Docker‑Compose | ![Docker](https://img.shields.io/badge/Docker-🐳-2496ED) |
| **CI/CD** | GitHub Actions | ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-⚙️-2088FF) |
| **Testing** | Pytest, Jest | ![Tests](https://img.shields.io/badge/Tests-🧪-green) |

---  

## Project Structure  

```
repo-mind/
├─ backend/
│   ├─ main.py                 # FastAPI entry point
│   ├─ routes/
│   │   ├─ deployer.py         # /deploy endpoints – Docker / K8s generation
│   │   ├─ ml_routes.py        # /ml endpoints – resource estimation
│   │   └─ repomind.py         # /repo endpoints – stack detection & analysis
│   └─ services/
│       ├─ deployment_engine.py   # Core logic for Docker / Compose files
│       ├─ ml_engine.py           # Resource‑estimation algorithm
│       ├─ repo_analyzer.py       # AST + ChromaDB chunking
│       └─ stack_detector.py      # detect_tech_stack()
├─ frontend/
│   ├─ public/
│   │   └─ index.html
│   ├─ src/
│   │   ├─ App.js                # Main SPA component (cards you saw)
│   │   └─ ...                   # other React components, hooks, utils
│   ├─ package.json
│   └─ README.md                 # Front‑end specific docs
├─ Dockerfile                     # Multi‑stage build (backend + frontend)
├─ docker-compose.yml
├─ .github/
│   └─ workflows/
│       └─ ci.yml                # Lint, test, build
├─ requirements.txt
├─ pyproject.toml
└─ README.md                     # ← you are here
```

> **Total files:** 22 (including tests, config, and docs).  

---  

## Getting Started  

### Prerequisites  

| Tool | Minimum version |
|------|-----------------|
| **Docker** | 24.0+ |
| **Docker‑Compose** | 2.20+ |
| **Python** | 3.10+ (if you prefer running the backend locally) |
| **Node.js** | 18+ (for UI development) |
| **Git** | any recent version |

### Quick Start with Docker (recommended)

```bash
# 1️⃣ Clone the repo
git clone https://github.com/your‑org/repo‑mind.git
cd repo-mind

# 2️⃣ Build & run (Docker will build both backend & frontend)
docker compose up --build -d

# 3️⃣ Open the UI
open http://localhost:3000   # or http://127.0.0.1:3000
```

The API is exposed on `http://localhost:8000` (FastAPI). Swagger UI is available at `http://localhost:8000/docs`.

### Development (backend only)

```bash
# Create a virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server (auto‑reload)
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Development (frontend only)

```bash
cd frontend
npm install
npm run dev   # Vite dev server → http://localhost:5173
```

---  

## API Reference  

All endpoints return **JSON** and follow standard HTTP status codes.  
Authentication is not required for the demo version; production can be wrapped with OAuth2/JWT.

| Method | Endpoint | Request Body | Description |
|--------|----------|--------------|-------------|
| **POST** | `/api/repo/analyze` | `RepoRequest { github_url: string }` | Clone the repo (temporarily), run `detect_tech_stack`, store semantic chunks. Returns detected stack & basic repo metadata. |
| **POST** | `/api/repo/question` | `QuestionRequest { repo_id: string, question: string }` | Ask a natural‑language question about the repo (uses embeddings + LLM). Returns an answer string. |
| **POST** | `/api/ml/estimate-resources` | `LogAnomalyRequest { logs: string[] }` *or* custom payload `{ file_list: string[], tech_stack: [...] }` | Calls `estimate_resources`. Returns RAM, CPU, workers, confidence, and reasoning. |
| **POST** | `/api/deploy/generate` | `{ repo_id: string, target: "docker" | "compose" | "k8s" }` | Generates infrastructure files (Dockerfile, docker‑compose.yml, optional Helm chart). Returns a zip archive. |
| **GET** | `/api/health` | – | Simple health‑check (`{ status: "ok" }`). |

### Example: Detect tech stack  

```bash
curl -X POST http://localhost:8000/api/repo/analyze \
  -H "Content-Type: application/json" \
  -d '{"github_url":"https://github.com/psf/requests"}'
```

**Response (truncated)**  

```json
{
  "repo_id": "abc123",
  "stack": [
    {"name":"Python","icon":"🐍","confidence":"high"},
    {"name":"FastAPI","icon":"⚡","confidence":"high"},
    {"name":"Docker","icon":"🐳","confidence":"high"},
    {"name":"PostgreSQL","icon":"🐘","confidence":"medium"}
  ],
  "files_analyzed": 124
}
```

### Example: Resource estimation  

```bash
curl -X POST http://localhost:8000/api/ml/estimate-resources \
  -H "Content-Type: application/json" \
  -d '{
        "file_list": ["app/main.py","requirements.txt","Dockerfile"],
        "tech_stack": [{"name":"Python"},{"name":"FastAPI"}]
      }'
```

**Response**

```json
{
  "recommended_ram_mb": 384,
  "recommended_cpu_cores": 0.75,
  "suggested_workers": 2,
  "confidence_score": "94%",
  "reasoning": "Calculated based on 3 files, python, fastapi runtime footprint."
}
```

---  

## CLI / UI Usage  

### UI Walk‑through  

1. **Repository Analysis** – Paste a GitHub URL → the card “01 Repository Analysis” shows a short description and a progress bar.  
2. **Infrastructure Generation** – After analysis, the “02 Infrastructure Generation” card appears; click **Generate** to download a zip containing Dockerfile, `docker-compose.yml`, and optional K8s manifests.  
3. **Resource Recommendation** – The UI automatically calls `/api/ml/estimate-resources` and displays RAM/CPU suggestions.  

### CLI (optional)  

A tiny wrapper script (`scripts/cli.py`) ships with the repo (not shown in the tree). Example:

```bash
python -m scripts.cli analyze https://github.com/your-org/awesome-app
python -m scripts.cli generate --target docker
python -m scripts.cli estimate
```

---  

## Contributing  

We welcome contributions! Follow these steps:

1. **Fork** the repository and create a feature branch.  
2. **Install** the development dependencies (see *Getting Started*).  
3. **Run tests** – `pytest` for backend, `npm test` for frontend.  
4. **Add** or update documentation in `README.md` or `frontend/README.md`.  
5. **Submit** a pull request with a clear description of the change.  

### Code Style  

* **Python** – `black`, `isort`, `flake8`.  
* **JavaScript/TypeScript** – `eslint` + `prettier`.  

### Testing  

```bash
# Backend
pytest -vv

# Frontend
npm run test
```

### Release Process  

1. Update `pyproject.toml` / `package.json` version.  
2. Tag the commit (`git tag vX.Y.Z && git push --tags`).  
3. GitHub Actions automatically builds and pushes a multi‑arch Docker image to Docker Hub (`repo-mind:latest`).  

---  

## License  

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---  

### Happy hacking! 🎉  

If you run into any issues, feel free to open an issue or join our Discord channel (link in the repo’s README).
