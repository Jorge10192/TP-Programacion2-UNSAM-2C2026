from fastapi import FastAPI

from src.compras.routes import router as proveedores_router


app = FastAPI(
    title="WALOS API",
    description="API para la gestión del emprendimiento WALOS",
    version="0.1.0",
)

# Incorporá a la aplicación los endpoints definidos en routes.py
app.include_router(proveedores_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}