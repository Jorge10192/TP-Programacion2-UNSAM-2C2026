from fastapi import FastAPI

from src.compras.routes import (
    categorias_insumos_router,
    insumos_router,
    proveedores_router,
)


app = FastAPI(
    title="WALOS API",
    description="API para la gestión del emprendimiento WALOS",
    version="0.1.0",
)


app.include_router(proveedores_router)
app.include_router(categorias_insumos_router)
app.include_router(insumos_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
