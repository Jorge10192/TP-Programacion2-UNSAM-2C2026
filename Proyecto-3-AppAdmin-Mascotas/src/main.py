from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from sqlalchemy.orm import Session
from alembic.config import Config
from alembic.script import ScriptDirectory

from src.auth.routes import router as auth_router
from src.compras.routes import router as proveedores_router
from src.database.session import PROJECT_DIR, get_db
from src.inventario.routes import router as inventario_router


app = FastAPI(
    title="WALOS API",
    description="API para la gestión del emprendimiento WALOS",
    version="0.2.0",
)

# Incorporá a la aplicación los endpoints definidos en routes.py
app.include_router(proveedores_router)
app.include_router(auth_router)
app.include_router(inventario_router)
EXPECTED_HEAD = ScriptDirectory.from_config(Config(str(PROJECT_DIR / "alembic.ini"))).get_current_head()


@app.exception_handler(OperationalError)
@app.exception_handler(ProgrammingError)
async def database_unavailable(request, error):
    return JSONResponse(status_code=503, content={"detail": "Base de datos no disponible o sin migrar"})


@app.exception_handler(IntegrityError)
async def data_conflict(request, error):
    return JSONResponse(status_code=409, content={"detail": "Registro duplicado o incompatible"})


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    revision = db.execute(text("SELECT version_num FROM alembic_version")).scalars().all()
    if revision != [EXPECTED_HEAD]:
        return JSONResponse(status_code=503, content={"detail": "Migraciones pendientes"})
    return {"status": "ok"}
