from fastapi import FastAPI
from .routes import router

app = FastAPI(
    title="Field Service MVP",
    version="1.0.0"
)

app.include_router(router, prefix="/api")
