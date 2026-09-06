from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from services.repo_analyzer import load_store
from services.ml_engine import estimate_resources, calculate_code_risk, detect_log_anomalies

router = APIRouter(prefix="/ml", tags=["ML Intelligence"])

class LogAnomalyRequest(BaseModel):
    logs: List[str]

@router.get("/resource-estimate/{repo_id}")
def get_resource_estimate(repo_id: str):
    store = load_store(repo_id)
    if not store:
        raise HTTPException(status_code=404, detail="Repository not found.")
    try:
        estimate = estimate_resources(store.get("file_list", []), store.get("tech_stack", []))
        return estimate
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to estimate resources: {str(e)}")

@router.get("/code-risk/{repo_id}")
def get_code_risk(repo_id: str):
    store = load_store(repo_id)
    if not store:
        raise HTTPException(status_code=404, detail="Repository not found.")
    try:
        risk_data = calculate_code_risk(store["repo_path"], store.get("file_list", []))
        return risk_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate code risk: {str(e)}")

@router.post("/detect-log-anomalies")
def check_log_anomalies(request: LogAnomalyRequest):
    try:
        results = detect_log_anomalies(request.logs)
        return {"results": results, "total_anomalies": sum(1 for r in results if r["is_anomaly"])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection error: {str(e)}")
