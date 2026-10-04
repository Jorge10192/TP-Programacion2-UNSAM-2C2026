from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# Campos comunes del proveedor
class ProveedorBase(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=150
    )

    observaciones: str | None = None

# Lo que permitimos recibir cuandos se crea un proveedor nuevo
class ProveedorCreate(ProveedorBase):
    pass

# Representa lo que devolvemos del proveedor una vez creado
class ProveedorResponse(ProveedorBase):
    # Transforma respuesta SQL en formato JSON
    model_config = ConfigDict(from_attributes=True)

    id: int
    activo: bool
    fecha_creacion: datetime