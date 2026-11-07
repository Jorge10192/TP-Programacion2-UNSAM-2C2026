from datetime import date
from decimal import Decimal
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

MAX_CENTS = 99_999_999_999
Money = Annotated[int, Field(strict=True, ge=0, le=MAX_CENTS)]
PositiveMoney = Annotated[int, Field(strict=True, gt=0, le=MAX_CENTS)]
Quantity = Annotated[Decimal, Field(ge=0, le=1_000_000_000, max_digits=18, decimal_places=6)]
PositiveQuantity = Annotated[Decimal, Field(gt=0, le=1_000_000_000, max_digits=18, decimal_places=6)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=150)]
PaymentMethod = Literal['EFECTIVO', 'TRANSFERENCIA', 'CUENTA_DNI', 'TARJETA', 'MERCADO_PAGO_DECLARADO']
UnitCode = Literal['UNIDAD', 'GRAMO', 'KILOGRAMO', 'MILILITRO', 'LITRO', 'PAQUETE', 'CAJA']


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

    @field_validator('*', mode='before')
    @classmethod
    def no_controls(cls, value):
        if isinstance(value, str) and any(ord(char) < 32 or ord(char) == 127 for char in value):
            raise ValueError('No se admiten caracteres de control')
        return value

    @field_validator('fecha', check_fields=False)
    @classmethod
    def calendar_range(cls, value):
        if not 2000 <= value.year <= 2100:
            raise ValueError('La fecha debe estar entre los años 2000 y 2100')
        return value


class Command(Input):
    request_id: UUID


class Location(Input):
    ubicacion_id: str


class ProviderCreate(Command):
    nombre: Name
    observaciones: str = Field(default='', max_length=2000)


class UnitConfigure(Input):
    codigo_ui: UnitCode


class CatalogCreate(Command):
    nombre: Name
    tipo: Literal['INSUMO', 'ELABORADO', 'REVENTA'] = 'INSUMO'
    sku: str | None = Field(default=None, max_length=32, pattern=r'^[A-Z0-9._-]*$')
    categoria_id: int = Field(gt=0)
    unidad_stock_id: int = Field(gt=0)
    vendible: bool = False
    precio_centavos: Money | None = None
    costo_referencia_centavos: Money | None = None
    descripcion: str = Field(default='', max_length=450)
    observaciones: str = Field(default='', max_length=600)

    @field_validator('sku', mode='before')
    @classmethod
    def sku_normalized(cls, value):
        return value.strip().upper() or None if isinstance(value, str) else value


class PurchaseItem(Input):
    insumo_id: int = Field(gt=0)
    cantidad: PositiveQuantity
    unidad_compra_id: int = Field(gt=0)
    costo_unitario_centavos: Money


class PurchaseCreate(Command):
    proveedor_id: int = Field(gt=0)
    fecha: date
    referencia_comercial: str = Field(default='', max_length=70)
    observaciones: str = Field(default='', max_length=500)
    items: list[PurchaseItem] = Field(min_length=1, max_length=30)

    @model_validator(mode='after')
    def unique_items(self):
        require_unique(self.items)
        return self


class CountItem(Input):
    insumo_id: int = Field(gt=0)
    cantidad_esperada: Quantity
    cantidad_contada: Quantity
    expected_version: int = Field(strict=True, ge=0)


class CountCreate(Command, Location):
    motivo: str = Field(min_length=5, max_length=180)
    items: list[CountItem] = Field(min_length=1, max_length=200)

    @field_validator('motivo', mode='before')
    @classmethod
    def normalized_reason(cls, value):
        if isinstance(value, str):
            if any(ord(char) < 32 or ord(char) == 127 for char in value):
                raise ValueError('El motivo no admite caracteres de control')
            return ' '.join(value.split())
        return value

    @model_validator(mode='after')
    def unique_items(self):
        require_unique(self.items)
        return self


class CashOpen(Command, Location):
    fondo_centavos: Money


class CashClose(Command):
    expected_version: int = Field(strict=True, ge=0)
    contado_centavos: Money
    motivo: str = Field(default='', max_length=500)


class SaleItem(Input):
    insumo_id: int = Field(gt=0)
    cantidad: PositiveQuantity
    precio_unitario_centavos: Money


class Payment(Input):
    medio: PaymentMethod
    importe_centavos: PositiveMoney
    cuenta_financiera_id: None = None


class SaleCreate(Command, Location):
    jornada_id: int = Field(gt=0)
    items: list[SaleItem] = Field(min_length=1, max_length=30)
    descuento_centavos: Money = 0
    pagos: list[Payment] = Field(min_length=1, max_length=6)
    observaciones: str = Field(default='', max_length=500)

    @model_validator(mode='after')
    def unique_items(self):
        require_unique(self.items)
        return self


class ExpenseCreate(Command, Location):
    jornada_id: int = Field(gt=0)
    fecha: date
    categoria: Literal['ALQUILER', 'INSUMOS', 'TRANSPORTE', 'PERSONAL', 'IMPUESTOS', 'MANTENIMIENTO', 'OTROS']
    concepto: str = Field(min_length=2, max_length=140)
    importe_centavos: PositiveMoney
    medio: Literal['EFECTIVO', 'TRANSFERENCIA', 'CUENTA_DNI', 'TARJETA', 'MERCADO_PAGO_DECLARADO', 'OTRO_DECLARADO']
    observaciones: str = Field(default='', max_length=500)
    cuenta_financiera_id: None = None


def require_unique(items):
    ids = [item.insumo_id for item in items]
    if len(set(ids)) != len(ids):
        raise ValueError('Un artículo no puede repetirse en el mismo comando')


class SnapshotResponse(BaseModel):
    schema_version: Literal[1] = 1
    as_of: str
    complete: Literal[True] = True
    contexto: dict[str, Any]
    unidades: list[dict[str, Any]]
    categorias: list[dict[str, Any]]
    catalogo: list[dict[str, Any]]
    proveedores: list[dict[str, Any]]
    compras: list[dict[str, Any]]
    stock: list[dict[str, Any]]
    movimientos: list[dict[str, Any]]
    conteos: list[dict[str, Any]]
    ventas: list[dict[str, Any]]
    gastos: list[dict[str, Any]]
    jornadas: list[dict[str, Any]]
