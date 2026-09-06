from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.repo_analyzer import index_repo, ask_question, get_dependency_graph, generate_readme

router = APIRouter(prefix="/repomind", tags=["RepoMind"])

class RepoRequest(BaseModel):
    github_url: str

class QuestionRequest(BaseModel):
    repo_id: str
    question: str

@router.post("/index")
def index_repository(request: RepoRequest):
    if not request.github_url or not request.github_url.strip():
        raise HTTPException(status_code=400, detail="A valid GitHub repository URL is required.")
    try:
        result = index_repo(request.github_url.strip())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index repository: {str(e)}")

@router.post("/ask")
def ask_repo_question(request: QuestionRequest):
    if not request.repo_id or not request.question:
        raise HTTPException(status_code=400, detail="repo_id and question are required.")
    try:
        answer = ask_question(request.repo_id, request.question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error answering question: {str(e)}")

@router.get("/graph/{repo_id}")
def get_graph(repo_id: str):
    if not repo_id:
        raise HTTPException(status_code=400, detail="repo_id is required.")
    try:
        return get_dependency_graph(repo_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving graph: {str(e)}")

@router.get("/readme/{repo_id}")
def generate_repo_readme(repo_id: str):
    if not repo_id:
        raise HTTPException(status_code=400, detail="repo_id is required.")
    try:
        readme = generate_readme(repo_id)
        return {"readme": readme}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating README: {str(e)}")