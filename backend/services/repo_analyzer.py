import os
import ast
import re
import shutil
import uuid
import json
import git
import networkx as nx
import chromadb
from chromadb.utils import embedding_functions
from groq import Groq
from dotenv import load_dotenv
from services.stack_detector import detect_tech_stack

load_dotenv()

groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=groq_api_key) if groq_api_key else None

chroma_client = chromadb.PersistentClient(path="./chroma_db")
embedder = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

REPO_STORE = {}
SUPPORTED_EXTENSIONS = ['.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.go', '.rs', '.rb', '.php', '.html', '.css', '.md', '.json', '.yaml', '.yml', '.toml', '.sql']
SKIP_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build', '.next', 'out', 'coverage', '.idea', '.vscode'}
SKIP_FILES = {'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock', 'Pipfile.lock'}

PRIMARY_MODEL = os.getenv("GROQ_MODEL", "groq/compound-mini")
CANDIDATE_MODELS = [
    PRIMARY_MODEL,
    "groq/compound-mini",
    "groq/compound",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b"
]


def call_groq_llm(messages: list, max_tokens: int = 800, temperature: float = 0.3) -> str:
    """
    Executes a chat completion via Groq with automatic fallback across models
    and cleans up thinking tags if present.
    """
    global groq_client
    if not groq_client:
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            return "Error: GROQ_API_KEY is not set in backend/.env. Please configure your Groq API key."
        groq_client = Groq(api_key=groq_api_key)

    seen = set()
    models_to_try = []
    for m in CANDIDATE_MODELS:
        if m and m not in seen:
            seen.add(m)
            models_to_try.append(m)

    last_error = None
    for model in models_to_try:
        try:
            response = groq_client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
            content = response.choices[0].message.content or ""
            
            if "<think>" in content and "</think>" in content:
                content = content.split("</think>", 1)[1].strip()
            elif "<think>" in content:
                content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
            return content
        except Exception as e:
            last_error = e
            continue

    return f"Unable to reach Groq LLM. All candidate models failed. Last error: {str(last_error)}"

def save_store(repo_id, store_data):
    os.makedirs("./repo_metadata", exist_ok=True)
    saveable = {
        "collection_name": store_data["collection_name"],
        "graph": store_data["graph"],
        "file_list": store_data["file_list"],
        "tech_stack": store_data["tech_stack"],
        "repo_path": store_data["repo_path"],
        "chat_history": store_data.get("chat_history", [])
    }
    with open(f"./repo_metadata/{repo_id}.json", "w", encoding="utf-8") as f:
        json.dump(saveable, f, indent=2)

def load_store(repo_id):
    path = f"./repo_metadata/{repo_id}.json"
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None

def clone_repo(github_url: str, repo_id: str):
    path = f"./repos/{repo_id}"
    if os.path.exists(path):
        shutil.rmtree(path, ignore_errors=True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    git.Repo.clone_from(github_url.strip(), path, depth=1)
    return path

def extract_python_chunks(filepath: str, content: str):
    chunks = []
    try:
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                chunk = ast.get_source_segment(content, node)
                if chunk and len(chunk.strip()) > 20:
                    chunks.append({
                        "text": f"File: {filepath}\nType: {'class' if isinstance(node, ast.ClassDef) else 'function'}\nName: {node.name}\n\n{chunk}",
                        "filepath": filepath,
                        "type": "class" if isinstance(node, ast.ClassDef) else "function",
                        "name": node.name
                    })
    except Exception:
        pass

    
    if not chunks:
        lines = content.split('\n')
        for i in range(0, len(lines), 50):
            chunk = '\n'.join(lines[i:i+50])
            if chunk.strip():
                chunks.append({
                    "text": f"File: {filepath}\n\n{chunk}",
                    "filepath": filepath,
                    "type": "block",
                    "name": f"lines_{i+1}-{min(i+50, len(lines))}"
                })
    return chunks


def extract_generic_chunks(filepath: str, content: str):
    chunks = []
    lines = content.split('\n')
    for i in range(0, len(lines), 60):
        chunk = '\n'.join(lines[i:i+60])
        if chunk.strip():
            chunks.append({
                "text": f"File: {filepath}\n\n{chunk}",
                "filepath": filepath,
                "type": "block",
                "name": f"lines_{i+1}-{min(i+60, len(lines))}"
            })
    return chunks

def build_dependency_graph(repo_path: str):
    G = nx.DiGraph()
    js_import_pattern = re.compile(r"""(?:import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))""")

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in ['.py', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']:
                filepath = os.path.join(root, filename)
                rel = filepath.replace(repo_path, '').strip('\\/').replace('\\', '/')
                G.add_node(rel)
                try:
                    content = open(filepath, 'r', encoding='utf-8', errors='ignore').read(50000)
                    if ext == '.py':
                        tree = ast.parse(content)
                        for node in ast.walk(tree):
                            if isinstance(node, ast.ImportFrom) and node.module:
                                G.add_edge(rel, node.module)
                            elif isinstance(node, ast.Import):
                                for alias in node.names:
                                    G.add_edge(rel, alias.name)
                    else:
                        for match in js_import_pattern.finditer(content):
                            mod = match.group(1) or match.group(2)
                            if mod:
                                G.add_edge(rel, mod)
                except Exception:
                    pass
    return G


def index_repo(github_url: str):
    repo_id = str(uuid.uuid4())[:8]
    repo_path = clone_repo(github_url, repo_id)

    all_chunks = []
    file_list = []

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            if filename in SKIP_FILES:
                continue
            ext = os.path.splitext(filename)[1].lower()
            if ext in SUPPORTED_EXTENSIONS:
                filepath = os.path.join(root, filename)
                rel = filepath.replace(repo_path, '').strip('\\/').replace('\\', '/')
                try:
                    
                    content = open(filepath, 'r', encoding='utf-8', errors='ignore').read(100000)
                    if not content.strip():
                        continue
                    file_list.append(rel)
                    if ext == '.py':
                        chunks = extract_python_chunks(rel, content)
                    else:
                        chunks = extract_generic_chunks(rel, content)
                    all_chunks.extend(chunks)
                except Exception:
                    pass

    collection_name = f"repo_{repo_id}"
    try:
        chroma_client.delete_collection(collection_name)
    except Exception:
        pass

    collection = chroma_client.create_collection(
        name=collection_name,
        embedding_function=embedder
    )

    
    if all_chunks:
        batch_size = 100
        for i in range(0, len(all_chunks), batch_size):
            batch = all_chunks[i:i+batch_size]
            collection.add(
                documents=[c["text"] for c in batch],
                ids=[f"chunk_{i+j}" for j, _ in enumerate(batch)],
                metadatas=[{"filepath": c["filepath"], "type": c["type"], "name": c["name"]} for c in batch]
            )

    graph = build_dependency_graph(repo_path)
    graph_data = {
        "nodes": list(graph.nodes()),
        "edges": [{"from": u, "to": v} for u, v in graph.edges()]
    }

    tech_stack = detect_tech_stack(repo_path, file_list)

    store_data = {
        "collection_name": collection_name,
        "graph": graph_data,
        "file_list": file_list,
        "tech_stack": tech_stack,
        "repo_path": repo_path,
        "chat_history": []
    }
    REPO_STORE[repo_id] = store_data
    save_store(repo_id, store_data)

    return {
        "status": "indexed",
        "repo_id": repo_id,
        "files_indexed": len(file_list),
        "chunks_created": len(all_chunks),
        "graph_nodes": len(graph_data["nodes"]),
        "graph_edges": len(graph_data["edges"]),
        "tech_stack": tech_stack
    }


def ask_question(repo_id: str, question: str):
    if repo_id not in REPO_STORE:
        data = load_store(repo_id)
        if not data:
            return "Repository data not found. Please index the repository first."
        REPO_STORE[repo_id] = data

    store = REPO_STORE[repo_id]

    try:
        collection = chroma_client.get_collection(
            name=store["collection_name"],
            embedding_function=embedder
        )
    except Exception:
        return "Vector collection not found. Please re-index the repository."

    total_chunks = collection.count()
    context = "No indexed code snippets found."
    if total_chunks > 0:
        n_res = min(5, total_chunks)
        results = collection.query(
            query_texts=[question],
            n_results=n_res
        )
        context_parts = []
        if results and results.get('documents') and len(results['documents']) > 0:
            for i, doc in enumerate(results['documents'][0]):
                meta = results['metadatas'][0][i] if (results.get('metadatas') and len(results['metadatas']) > 0) else {}
                fp = meta.get('filepath', 'unknown')
                tp = meta.get('type', 'code')
                nm = meta.get('name', '')
                context_parts.append(
                    f"[{i+1}] File: {fp} | {tp}: {nm}\n{doc[:800]}"
                )
            context = "\n\n---\n\n".join(context_parts)

    stack_str = ', '.join([t['name'] if isinstance(t, dict) else str(t) for t in store.get('tech_stack', [])]) or "General"
    chat_history = store.get("chat_history", [])[-6:]  

    messages = [
        {
            "role": "system",
            "content": f"""You are an expert code assistant analyzing a {stack_str} codebase.
Answer questions clearly, accurately, and specifically. Mention exact file names, functions, and components whenever relevant.
Format your answer with:
- A direct answer in 2-3 sentences
- Key files/functions involved
- A brief code explanation or snippet if relevant
Keep answers concise, professional, and developer-friendly."""
        }
    ]
    messages.extend(chat_history)
    messages.append({
        "role": "user",
        "content": f"Relevant codebase context:\n{context}\n\nQuestion: {question}"
    })

    answer = call_groq_llm(messages, max_tokens=600)

   
    if "chat_history" not in store:
        store["chat_history"] = []
    store["chat_history"].append({"role": "user", "content": question})
    store["chat_history"].append({"role": "assistant", "content": answer})
    save_store(repo_id, store)

    return answer


def generate_readme(repo_id: str):
    if repo_id not in REPO_STORE:
        data = load_store(repo_id)
        if not data:
            return "Repository data not found. Please index the repository first."
        REPO_STORE[repo_id] = data

    store = REPO_STORE[repo_id]

    try:
        collection = chroma_client.get_collection(
            name=store["collection_name"],
            embedding_function=embedder
        )
    except Exception:
        return "Vector collection not found. Please re-index the repository."

    context = ""
    total_chunks = collection.count()
    if total_chunks > 0:
        n_res = min(6, total_chunks)
        results = collection.query(
            query_texts=["main entry point overview purpose structure of this project"],
            n_results=n_res
        )
        if results and results.get('documents') and len(results['documents']) > 0:
            context = "\n\n".join(results['documents'][0])

    stack_str = ', '.join([t['name'] if isinstance(t, dict) else str(t) for t in store.get('tech_stack', [])]) or "General"
    file_list = store.get('file_list', [])
    key_files = ', '.join(file_list[:12])

    messages = [
        {
            "role": "system",
            "content": "You are a senior technical writer and software architect. Generate a comprehensive, well-structured, professional README.md."
        },
        {
            "role": "user",
            "content": f"""Generate a complete, production-grade README.md based on this codebase:

Tech Stack: {stack_str}
Total Files: {len(file_list)}
Key Files: {key_files}

Codebase Context:
{context}

Include:
1. Project Title & Catchy Description
2. Features & Capabilities
3. Tech Stack (formatted as a clean table or badges)
4. Project Structure (ASCII directory tree)
5. Getting Started / Installation Steps
6. Usage Examples & API Endpoints (if applicable)
7. Contributing & License

Use clean Markdown formatting with tables, code blocks, and clear section dividers."""
        }
    ]

    readme = call_groq_llm(messages, max_tokens=1200)
    return readme


def get_dependency_graph(repo_id: str):
    if repo_id not in REPO_STORE:
        data = load_store(repo_id)
        if not data:
            return {"nodes": [], "edges": []}
        REPO_STORE[repo_id] = data
    return REPO_STORE[repo_id].get("graph", {"nodes": [], "edges": []})
