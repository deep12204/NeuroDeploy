from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from services.repo_analyzer import load_store
from services.deployment_engine import (
    inspect_env_vars,
    generate_dockerfile,
    launch_app,
    stop_app,
    get_app_status,
    get_app_logs,
    diagnose_failure_with_ai
)

router = APIRouter(prefix="/deploy", tags=["Deployer"])

class InspectEnvRequest(BaseModel):
    repo_id: str

class GenerateDockerfileRequest(BaseModel):
    repo_id: str

class LaunchRequest(BaseModel):
    repo_id: str
    env_vars: Optional[Dict[str, str]] = None
    custom_command: Optional[str] = None

class DoctorRequest(BaseModel):
    repo_id: str
    error_logs: str

@router.post("/inspect-env")
def inspect_environment(request: InspectEnvRequest):
    store = load_store(request.repo_id)
    if not store:
        raise HTTPException(status_code=404, detail="Repository not found.")
    try:
        env_vars = inspect_env_vars(store["repo_path"], store.get("file_list", []))
        return {"env_vars": env_vars}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to inspect environment: {str(e)}")

@router.post("/generate-dockerfile")
def get_dockerfile(request: GenerateDockerfileRequest):
    store = load_store(request.repo_id)
    if not store:
        raise HTTPException(status_code=404, detail="Repository not found.")
    try:
        data = generate_dockerfile(store["repo_path"], store.get("tech_stack", []), store.get("file_list", []))
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Dockerfile: {str(e)}")

@router.post("/launch")
def launch_application(request: LaunchRequest):
    try:
        res = launch_app(request.repo_id, request.env_vars, request.custom_command)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Launch error: {str(e)}")

@router.post("/stop/{deploy_id}")
def stop_application(deploy_id: str):
    try:
        return stop_app(deploy_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping app: {str(e)}")

@router.get("/status/{deploy_id}")
def get_status(deploy_id: str):
    try:
        return get_app_status(deploy_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving status: {str(e)}")

@router.get("/logs/{deploy_id}")
def get_logs(deploy_id: str):
    try:
        return get_app_logs(deploy_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading logs: {str(e)}")

@router.post("/doctor")
def run_ai_doctor(request: DoctorRequest):
    try:
        diagnosis = diagnose_failure_with_ai(request.repo_id, request.error_logs)
        return {"diagnosis": diagnosis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Doctor failed: {str(e)}")
