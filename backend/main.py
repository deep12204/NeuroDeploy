from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.repomind import router as repomind_router
from routes.deployer import router as deployer_router
from routes.ml_routes import router as ml_router

app = FastAPI(title="NeuroDeploy API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repomind_router)
app.include_router(deployer_router)
app.include_router(ml_router)

@app.get("/")
def root():
    return {
        "message": "NeuroDeploy Phase 3 API is running",
        "status": "online",
        "features": ["RepoMind", "Smart Deployment", "ML Intelligence", "Log Anomaly Detection"]
    }