# Schemas / DTOs API — Bloque 1 Fundación

> **Estado:** versión de referencia para implementación del Bloque 1.  
> **Alcance:** M01 — Organización del Negocio + M02 — Catálogo.  
> **Framework objetivo:** FastAPI + Pydantic v2.  
> **Base contractual:** `contrato-api.md` + `endpoints.md`.  
> **Objetivo:** congelar la forma de los datos HTTP sin mezclar transporte, dominio y persistencia.

---

## 1. Propósito

Este documento define los schemas de request, response, query y error utilizados por la API del Bloque 1.

La separación obligatoria es:

~~~text
Cliente HTTP
    ↓
Pydantic Schema
    ↓
mapeo explícito
    ↓
Command / DTO de Application
    ↓
Domain
    ↓
Mapper de Infrastructure
    ↓
SQLAlchemy
~~~

Por lo tanto:

~~~text
Pydantic Schema != Entidad Domain != Modelo SQLAlchemy
~~~

Una IA que implemente el proyecto no debe convertir automáticamente un schema Pydantic en entidad ORM ni pasar modelos HTTP directamente al Domain.

---

# PARTE I — CONFIGURACIÓN Y TIPOS TRANSVERSALES

## 2. Base para requests estrictos

Los DTOs de escritura usan una base equivalente a:

~~~python
from pydantic import BaseModel, ConfigDict

class StrictRequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid")
~~~

Resultado:

~~~text
campo inesperado
→ 422 REQUEST_VALIDATION_ERROR
~~~

No se ignoran typos ni propiedades que el contrato no reconoce.

## 3. Base para responses y Value Objects HTTP

Los DTOs de salida pueden usar:

~~~python
class ResponseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
~~~

Para shapes embebidos que se reutilizan en entrada y salida, como `CapacidadesArticuloSchema`, se utiliza una base separada:

~~~python
class ValueSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
    )
~~~

`from_attributes=True` permite construir responses desde objetos de lectura, DTOs de Application o Value Objects de Domain.

No autoriza este atajo:

~~~text
SQLAlchemy Model
→ router
→ response_model
~~~

El flujo preferido continúa siendo:

~~~text
SQLAlchemy
→ Mapper / Repository
→ Domain o Read Model
→ Application
→ Response Schema
~~~

## 4. Whitespace

No se configura `str_strip_whitespace=True` globalmente.

No debe alterarse silenciosamente:

~~~text
password
access_token
token de invitación
otros secretos
~~~

Para texto funcional obligatorio se rechaza vacío/whitespace, preservando la política de normalización compartida.

Ejemplo conceptual:

~~~python
from typing import Annotated
from pydantic import AfterValidator

def non_blank(value: str) -> str:
    if not value.strip():
        raise ValueError("El valor no puede estar vacío.")
    return value

NonBlankStr = Annotated[str, AfterValidator(non_blank)]
~~~

Para opcionales como `rubro`, `descripcion` y `sku`:

~~~text
"" / whitespace-only
→ null
~~~

cuando corresponda.

## 5. UUID

Los identificadores del Bloque 1 son UUIDv4.

~~~python
from pydantic import UUID4
~~~

JSON:

~~~json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
~~~

## 6. Version

~~~python
from typing import Annotated
from pydantic import Field

Version = Annotated[int, Field(ge=1)]
~~~

`version` nunca admite 0, negativos ni null.

## 7. Datetime UTC

Los instantes son timezone-aware.

~~~python
from datetime import timezone
from typing import Annotated
from pydantic import AwareDatetime, PlainSerializer

UtcDatetime = Annotated[
    AwareDatetime,
    PlainSerializer(
        lambda value: value.astimezone(timezone.utc)
                           .isoformat()
                           .replace("+00:00", "Z"),
        return_type=str,
        when_used="json",
    ),
]
~~~

Ejemplo:

~~~json
"2026-10-28T21:00:00Z"
~~~

## 8. Dinero

Persistencia:

~~~text
NUMERIC(19,4)
~~~

Python:

~~~text
Decimal
~~~

JSON:

~~~json
{
  "precio_base": "2500.0000"
}
~~~

Tipo conceptual:

~~~python
from decimal import Decimal, InvalidOperation
from typing import Annotated
from pydantic import BeforeValidator, Field, PlainSerializer, WithJsonSchema

def parse_decimal_http(value):
    if isinstance(value, Decimal):
        return value

    if isinstance(value, str):
        try:
            return Decimal(value)
        except InvalidOperation as exc:
            raise ValueError("El importe debe ser un decimal válido.") from exc

    raise ValueError("El importe debe enviarse como string decimal.")

Money = Annotated[
    Decimal,
    BeforeValidator(parse_decimal_http),
    Field(
        ge=Decimal("0"),
        max_digits=19,
        decimal_places=4,
    ),
    WithJsonSchema(
        {
            "type": "string",
            "pattern": r"^\d+(?:\.\d{1,4})?$",
            "example": "2500.0000",
        },
        mode="validation",
    ),
    PlainSerializer(
        lambda value: format(value, ".4f"),
        return_type=str,
        when_used="json",
    ),
]
~~~

No se basa el contrato monetario en `float`.

## 9. Enums

Cuando el conjunto coincide exactamente, los schemas reutilizan enums semánticos de Domain:

~~~text
Rol
EstadoMembresia
EstadoInvitacion
ModalidadOperativa

EstadoCategoria
EstadoArticulo
TipoArticulo
UnidadMedida
~~~

Se serializan como strings estables en mayúsculas.

No crear duplicados `RolApi / RolDb / RolDomain` sin necesidad.

Para subconjuntos de entrada/salida se definen aliases de transporte que no inventan un rol nuevo:

~~~python
RolInvitacion = Literal["ENCARGADO", "TRABAJADOR"]
RolNoPropietario = Literal["ENCARGADO", "TRABAJADOR"]
~~~

Así OpenAPI no anuncia `PROPIETARIO` como valor válido donde el contrato lo prohíbe.

---

# PARTE II — PATCH: OMITIDO VS NULL

## 10. Regla central

~~~text
campo omitido != campo enviado como null
~~~

Ejemplo:

~~~json
{}
~~~

significa conservar la descripción.

~~~json
{
  "descripcion": null
}
~~~

significa limpiarla.

## 11. Pydantic v2

Se usa:

~~~python
request.model_fields_set
request.model_dump(exclude_unset=True)
~~~

Ejemplo:

~~~python
changes = request.model_dump(
    exclude_unset=True,
    exclude={"version"},
)
~~~

Así:

~~~text
omitido
→ no aparece en changes

null explícito
→ aparece como None
~~~

No pasar `request.model_dump()` completo a Application en un PATCH.

## 12. Campos no-nullable opcionales de enviar

Campos como:

~~~text
nombre
unidad_medida
capacidades
imagenes
~~~

pueden omitirse, pero si se envían no admiten null.

Una validación de modelo debe revisar `model_fields_set` y rechazar null explícito.

Además, un PATCH debe contener al menos un campo editable además de `version`.

---

# PARTE III — ERRORES, PAGINACIÓN Y QUERY

## 13. FieldIssue

~~~python
class FieldIssue(ResponseModel):
    field: str
    issue: str
~~~

Ejemplos de `field`:

~~~text
sku
imagenes.0.posicion
capacidades.controla_stock
~~~

## 14. ErrorResponse

~~~python
class ErrorResponse(ResponseModel):
    code: str
    message: str
    details: list[FieldIssue]
    timestamp: UtcDatetime
~~~

No se crea una jerarquía adicional de errores mientras `FieldIssue` cubra el contrato actual.

## 15. PageResponse

~~~python
from typing import Generic, TypeVar

T = TypeVar("T")

class PageResponse(ResponseModel, Generic[T]):
    items: list[T]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    pages: int = Field(ge=0)
~~~

Constraints:

~~~text
total >= 0
page >= 1
1 <= page_size <= 100
pages >= 0
~~~

Para `total = 0`:

~~~text
items = []
pages = 0
~~~

## 16. PageQuery

~~~python
class PageQuery(StrictRequestModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
~~~

## 17. SortOrder

~~~python
from typing import Literal

SortOrder = Literal["asc", "desc"]
~~~

---

# PARTE IV — M01 AUTENTICACIÓN E IDENTIDAD

## 18. RegistrarUsuarioRequest

~~~python
from pydantic import SecretStr

class RegistrarUsuarioRequest(StrictRequestModel):
    nombre: NonBlankStr
    email: NonBlankStr
    password: SecretStr
~~~

No recibe:

~~~text
rol
negocio_id
estado
password_hash
~~~

La política exacta de password queda centralizada en IAM.

La equivalencia funcional del Email pertenece al Value Object `Email`, no a Pydantic.

## 19. LoginRequest

~~~python
class LoginRequest(StrictRequestModel):
    email: NonBlankStr
    password: SecretStr
~~~

No aplicar trim automático al password.

## 20. AccessTokenResponse

~~~python
from pydantic import PositiveInt

class AccessTokenResponse(ResponseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: PositiveInt
~~~

Regla:

~~~text
expires_in > 0
~~~

No incluye rol ni negocio autoritativo.

## 21. UsuarioResponse

~~~python
class UsuarioResponse(ResponseModel):
    id: UUID4
    nombre: str
    email: str
    fecha_registro: UtcDatetime
    updated_at: UtcDatetime
~~~

Nunca expone:

~~~text
email_normalizado
password_hash
~~~

---

# PARTE V — M01 NEGOCIOS Y MEMBRESÍAS

## 22. CrearNegocioRequest

~~~python
class CrearNegocioRequest(StrictRequestModel):
    nombre: NonBlankStr
    rubro: str | None = None
    modalidades: list[ModalidadOperativa] = Field(
        min_length=1,
        max_length=3,
    )
~~~

Reglas:

~~~text
1 <= len(modalidades) <= 3
sin duplicados
rubro blank → null
~~~

La unicidad de modalidades debe validarse explícitamente; no convertir a `set` porque el contrato JSON sigue siendo una lista.

No recibe:

~~~text
moneda_base
version
usuario_propietario_id
~~~

`moneda_base = ARS` y el propietario surge del Usuario autenticado.

## 23. ActualizarModalidadesRequest

~~~python
class ActualizarModalidadesRequest(StrictRequestModel):
    modalidades: list[ModalidadOperativa] = Field(
        min_length=1,
        max_length=3,
    )
    version: Version
~~~

Reglas:

~~~text
1..3
sin duplicados
~~~

La unicidad debe validarse explícitamente sobre la lista.

Representa reemplazo completo.

## 24. NegocioResponse

~~~python
class NegocioResponse(ResponseModel):
    id: UUID4
    nombre: str
    rubro: str | None
    moneda_base: Literal["ARS"]
    modalidades: list[ModalidadOperativa]
    version: Version
    created_at: UtcDatetime
    updated_at: UtcDatetime
~~~

## 25. NegocioResumenResponse

~~~python
class NegocioResumenResponse(ResponseModel):
    id: UUID4
    nombre: str
    rubro: str | None
    moneda_base: Literal["ARS"]
    modalidades: list[ModalidadOperativa]
~~~

No incluye `version` porque desde este contexto no representa un recurso editable.

## 26. NegocioMembresiaResponse

~~~python
class NegocioMembresiaResponse(ResponseModel):
    usuario_negocio_id: UUID4
    negocio: NegocioResumenResponse
    rol: Rol
~~~

El endpoint `GET /usuarios/me/negocios` solo devuelve membresías ACTIVO.

Alias:

~~~text
NegocioMembresiaPageResponse
= PageResponse[NegocioMembresiaResponse]
~~~

## 27. UsuarioResumenResponse

~~~python
class UsuarioResumenResponse(ResponseModel):
    id: UUID4
    nombre: str
    email: str
~~~

Se usa únicamente en contextos autenticados/autorizados.

## 28. MiembroResponse

~~~python
class MiembroResponse(ResponseModel):
    id: UUID4
    usuario: UsuarioResumenResponse
    rol: Rol
    estado: EstadoMembresia
    fecha_incorporacion: UtcDatetime
    version: Version
    updated_at: UtcDatetime
~~~

Muy importante:

~~~text
MiembroResponse.id = usuario_negocio.id
MiembroResponse.usuario.id = usuario.id
~~~

Alias:

~~~text
MiembroPageResponse
= PageResponse[MiembroResponse]
~~~

## 29. CambiarRolMiembroRequest

~~~python
class CambiarRolMiembroRequest(StrictRequestModel):
    nuevo_rol: RolNoPropietario
    version: Version
~~~

`PROPIETARIO` se maneja mediante comando específico.

## 30. PromoverPropietarioRequest

~~~python
class PromoverPropietarioRequest(StrictRequestModel):
    version: Version
~~~

No recibe rol libre.

## 31. DesactivarMiembroRequest

~~~python
class DesactivarMiembroRequest(StrictRequestModel):
    version: Version
~~~

## 32. PreparacionItemResponse

La preparación es una proyección derivada.

~~~python
class PreparacionItemResponse(ResponseModel):
    codigo: str
    titulo: str
    completado: bool
~~~

Los códigos concretos de módulos futuros no se inventan preventivamente.

## 33. PreparacionNegocioResponse

~~~python
class PreparacionNegocioResponse(ResponseModel):
    negocio_id: UUID4
    items: list[PreparacionItemResponse]
~~~

No crea un estado global `COMPLETO / INCOMPLETO`.

---

# PARTE VI — M01 INVITACIONES

## 34. CrearInvitacionRequest

~~~python
class CrearInvitacionRequest(StrictRequestModel):
    email_destino: NonBlankStr
    rol_propuesto: RolInvitacion
~~~

No recibe:

~~~text
negocio_id
emisor
fecha_emision
fecha_expiracion
estado
token
token_hash
~~~

Esos valores se derivan del contexto y política de Application.

## 35. InvitacionNegocioResponse

Vista administrativa del Negocio:

~~~python
class InvitacionNegocioResponse(ResponseModel):
    id: UUID4
    email_destino: str
    rol_propuesto: RolInvitacion
    estado: EstadoInvitacion
    fecha_emision: UtcDatetime
    fecha_expiracion: UtcDatetime
    vigente: bool
    emisor_miembro_id: UUID4
    version: Version
~~~

Nunca expone:

~~~text
email_destino_normalizado
token_hash
~~~

Alias:

~~~text
InvitacionNegocioPageResponse
= PageResponse[InvitacionNegocioResponse]
~~~

## 36. InvitacionEmitidaResponse

~~~python
class InvitacionEmitidaResponse(ResponseModel):
    invitacion: InvitacionNegocioResponse
    enlace_compartible: str
~~~

El token público recién generado puede retornarse como parte del enlace, pero no su hash.

## 37. EnlaceInvitacionResponse

~~~python
class EnlaceInvitacionResponse(ResponseModel):
    url: str
~~~

No se fuerza `HttpUrl` porque una evolución futura puede utilizar deep links.

## 38. InvitacionPublicaResponse

~~~python
class InvitacionPublicaResponse(ResponseModel):
    negocio_nombre: str
    rol_propuesto: RolInvitacion
    email_destino_ofuscado: str
    disponible: bool
~~~

No expone:

~~~text
invitacion_id
negocio_id
email completo
token_hash
version
emisor
~~~

## 39. InvitacionUsuarioResponse

Vista autenticada del destinatario:

~~~python
class InvitacionUsuarioResponse(ResponseModel):
    id: UUID4
    negocio: NegocioResumenResponse
    rol_propuesto: RolInvitacion
    estado: EstadoInvitacion
    fecha_emision: UtcDatetime
    fecha_expiracion: UtcDatetime
    vigente: bool
    version: Version
~~~

No devuelve token ni token_hash.

Alias:

~~~text
InvitacionUsuarioPageResponse
= PageResponse[InvitacionUsuarioResponse]
~~~

## 40. CancelarInvitacionRequest

~~~python
class CancelarInvitacionRequest(StrictRequestModel):
    version: Version
~~~

## 41. Aceptar/Rechazar por token

Para:

~~~text
POST /api/v1/invitaciones/{token}/aceptar
POST /api/v1/invitaciones/{token}/rechazar
~~~

no se requiere body.

Autoridad:

~~~text
token path
+
Usuario autenticado
+
estado persistido
+
revalidación transaccional
~~~

No crear schemas vacíos artificiales.

## 42. AceptarInvitacionResponse

~~~python
class AceptarInvitacionResponse(ResponseModel):
    invitacion: InvitacionUsuarioResponse
    membresia: NegocioMembresiaResponse
~~~

---

# PARTE VII — M02 CATEGORÍAS

## 43. CrearCategoriaRequest

~~~python
class CrearCategoriaRequest(StrictRequestModel):
    nombre: NonBlankStr
~~~

Estado inicial: `ACTIVA`.

## 44. EditarCategoriaRequest

~~~python
class EditarCategoriaRequest(StrictRequestModel):
    nombre: str | None = None
    version: Version
~~~

Reglas:

~~~text
nombre omitido → sin cambio
nombre = null → 422
nombre blank → 422
solo version → 422
~~~

No modifica estado.

## 45. CambiarEstadoCategoriaRequest

~~~python
class CambiarEstadoCategoriaRequest(StrictRequestModel):
    version: Version
~~~

## 46. CategoriaResponse

~~~python
class CategoriaResponse(ResponseModel):
    id: UUID4
    negocio_id: UUID4
    nombre: str
    estado: EstadoCategoria
    version: Version
    created_at: UtcDatetime
    updated_at: UtcDatetime
~~~

No expone `nombre_normalizado`.

Alias:

~~~text
CategoriaPageResponse
= PageResponse[CategoriaResponse]
~~~

---

# PARTE VIII — M02 ARTÍCULOS

## 47. CapacidadesArticuloSchema

Es el shape del Value Object embebido y puede reutilizarse como estructura de entrada/salida porque no posee identidad ni campos generados.

~~~python
class CapacidadesArticuloSchema(ValueSchema):
    es_comprable: bool
    es_vendible: bool
    controla_stock: bool
    puede_usarse_en_produccion: bool
    controla_vencimiento: bool
    permite_descuento: bool
~~~

Domain sigue siendo la autoridad final sobre sus invariantes.

## 48. ArticuloImagenInput

~~~python
class ArticuloImagenInput(StrictRequestModel):
    referencia_storage: NonBlankStr
    posicion: int = Field(ge=1, le=3)
    es_principal: bool
~~~

No recibe id, tenant, articulo_id ni timestamps.

## 49. ArticuloImagenResponse

~~~python
class ArticuloImagenResponse(ResponseModel):
    id: UUID4
    referencia_storage: str
    posicion: int
    es_principal: bool
    created_at: UtcDatetime
~~~

## 50. Validación de colección de imágenes

~~~text
0 <= N <= 3

N = 0
→ 0 principales

N > 0
→ exactamente 1 principal

posiciones únicas
posicion ∈ {1,2,3}
~~~

Pydantic puede prevalidar la colección; Domain y PostgreSQL siguen protegiendo la invariante.

## 51. CrearArticuloRequest

~~~python
class CrearArticuloRequest(StrictRequestModel):
    nombre: NonBlankStr
    descripcion: str | None = None

    tipo: TipoArticulo
    unidad_medida: UnidadMedida

    categoria_id: UUID4 | None = None
    sku: str | None = None

    precio_base: Money | None = None
    costo_referencia: Money | None = None

    capacidades: CapacidadesArticuloSchema

    imagenes: list[ArticuloImagenInput] = Field(
        default_factory=list,
        max_length=3,
    )
~~~

Normalización de frontera:

~~~text
descripcion blank → null
sku blank → null
~~~

No recibe:

~~~text
id
negocio_id
estado
version
nombre_normalizado
sku_normalizado
timestamps
~~~

Nace `ACTIVO`.

## 52. Qué valida CrearArticuloRequest

API/Pydantic puede rechazar:

- tipos JSON incorrectos;
- enums inválidos;
- dinero mal formado;
- dinero negativo;
- más de tres imágenes;
- posición inválida;
- posiciones repetidas;
- principal inexistente/duplicada;
- campos extra.

Application/Domain validan:

- Categoria ACTIVA y del mismo Negocio;
- nombre único;
- SKU único;
- coherencia Tipo/Capacidades;
- vendible con precio;
- uso operativo mínimo;
- guardias contextuales.

Pydantic no consulta repositories.

## 53. EditarArticuloRequest

~~~python
class EditarArticuloRequest(StrictRequestModel):
    version: Version

    nombre: str | None = None
    descripcion: str | None = None
    unidad_medida: UnidadMedida | None = None
    categoria_id: UUID4 | None = None
    sku: str | None = None

    precio_base: Money | None = None
    costo_referencia: Money | None = None

    capacidades: CapacidadesArticuloSchema | None = None
    imagenes: list[ArticuloImagenInput] | None = None
~~~

No posee:

~~~text
tipo
estado
negocio_id
id
~~~

`extra="forbid"` hace que enviarlos sea 422.

## 54. Semántica exacta de EditarArticuloRequest

Nullable si se envían:

~~~text
descripcion
categoria_id
sku
precio_base
costo_referencia
~~~

Significado:

~~~text
descripcion = null → limpiar
categoria_id = null → desasociar
sku = null → quitar
precio_base = null → quitar si configuración resultante lo permite
costo_referencia = null → quitar
~~~

No-nullable si se envían:

~~~text
nombre
unidad_medida
capacidades
imagenes
~~~

Si alguno aparece con null:

~~~text
422 REQUEST_VALIDATION_ERROR
~~~

Para limpiar imágenes:

~~~json
{
  "version": 5,
  "imagenes": []
}
~~~

No:

~~~json
{
  "version": 5,
  "imagenes": null
}
~~~

Solo `version` sin cambios también es inválido.

## 55. Imágenes en PATCH

~~~text
imagenes omitido
→ conservar colección actual

imagenes enviado
→ reemplazar colección completa de forma atómica
~~~

No se introduce un protocolo de diff parcial de imágenes en Bloque 1.

Toda modificación de imágenes incrementa la `version` del Articulo padre.

## 56. CambiarEstadoArticuloRequest

~~~python
class CambiarEstadoArticuloRequest(StrictRequestModel):
    version: Version
~~~

Se usa en `/desactivar` y `/reactivar`.

## 57. ArticuloResponse

~~~python
class ArticuloResponse(ResponseModel):
    id: UUID4
    negocio_id: UUID4

    nombre: str
    descripcion: str | None

    tipo: TipoArticulo
    unidad_medida: UnidadMedida
    categoria_id: UUID4 | None

    sku: str | None

    precio_base: Money | None
    costo_referencia: Money | None

    estado: EstadoArticulo
    capacidades: CapacidadesArticuloSchema

    imagenes: list[ArticuloImagenResponse]

    version: Version
    created_at: UtcDatetime
    updated_at: UtcDatetime
~~~

Nunca expone:

~~~text
nombre_normalizado
sku_normalizado
~~~

Alias:

~~~text
ArticuloPageResponse
= PageResponse[ArticuloResponse]
~~~

No se crea `ArticuloResumenResponse` preventivamente.

---

# PARTE IX — QUERY SCHEMAS

## 58. CategoriaListQuery

~~~python
class CategoriaListQuery(PageQuery):
    estado: list[EstadoCategoria] | None = None
    q: str | None = None
    sort: Literal["nombre", "created_at", "updated_at"] = "nombre"
    order: SortOrder = "asc"
~~~

Semántica:

~~~text
estado ausente → ACTIVA
estado=ACTIVA&estado=INACTIVA → ambas
~~~

No existe enum artificial `TODAS`.

## 59. ArticuloListQuery

~~~python
class ArticuloListQuery(PageQuery):
    estado: list[EstadoArticulo] | None = None
    tipo: TipoArticulo | None = None
    categoria_id: UUID4 | None = None
    q: str | None = None
    sort: Literal["nombre", "created_at", "updated_at"] = "nombre"
    order: SortOrder = "asc"
~~~

Semántica:

~~~text
estado ausente → ACTIVO
~~~

## 60. MiembroListQuery

~~~python
class MiembroListQuery(PageQuery):
    estado: EstadoMembresia | None = None
    rol: Rol | None = None
    q: str | None = None
    sort: Literal["fecha_incorporacion", "nombre"] = "nombre"
    order: SortOrder = "asc"
~~~

## 61. InvitacionNegocioListQuery

~~~python
class InvitacionNegocioListQuery(PageQuery):
    estado: EstadoInvitacion | None = None
    q: str | None = None
    sort: Literal["fecha_emision", "fecha_expiracion"] = "fecha_emision"
    order: SortOrder = "desc"
~~~

## 62. InvitacionUsuarioListQuery

~~~python
class InvitacionUsuarioListQuery(PageQuery):
    estado: EstadoInvitacion | None = None
    sort: Literal["fecha_emision", "fecha_expiracion"] = "fecha_emision"
    order: SortOrder = "desc"
~~~

## 63. ExpectedVersionQuery

Para hard delete:

~~~text
DELETE ...?version=N
~~~

~~~python
class ExpectedVersionQuery(StrictRequestModel):
    version: Version
~~~

Aplica a Categoria y ArticuloCatalogo.

---

# PARTE X — MAPEOS Y RESPONSABILIDADES

## 64. Request → Application Command

Ejemplo conceptual:

~~~python
changes = request.model_dump(
    exclude_unset=True,
    exclude={"version"},
)

command = EditarArticuloCommand(
    negocio_id=tenant.negocio_id,
    articulo_id=articulo_id,
    actor_usuario_id=tenant.usuario_id,
    expected_version=request.version,
    changes=changes,
)
~~~

No pasar `EditarArticuloRequest` al Domain.

## 65. Application → Response

Preferir:

~~~text
Resultado del Caso de Uso / Read Model
→ ResponseSchema.model_validate(...)
~~~

No devolver objetos SQLAlchemy/lazy relationships desde el router.

## 66. Campos internos que nunca cruzan la API

~~~text
email_normalizado
nombre_normalizado
sku_normalizado
password_hash
token_hash
~~~

## 67. División de validaciones

### API / Pydantic

- shape JSON;
- required/nullable;
- enum;
- UUID;
- version >= 1;
- Decimal;
- dinero no negativo;
- colección de imágenes;
- extra forbid;
- PATCH con cambios.

### Application

- autorización;
- tenant;
- repositories;
- Categoria vigente;
- unicidad precheck;
- membresía histórica;
- invitación vigente;
- transacciones;
- concurrencia;
- auditoría.

### Domain

- invariantes;
- transiciones;
- reglas funcionales;
- edición atómica;
- configuración coherente.

### PostgreSQL

- FK;
- UNIQUE;
- CHECK;
- índices parciales;
- FK tenant-safe;
- defensa final concurrente.

---

# PARTE XI — SEGURIDAD

## 68. Password

`password` usa `SecretStr`.

Nunca:

- response;
- auditoría;
- logs;
- ErrorResponse.

## 69. RequestValidationError

El handler no debe copiar ciegamente el contenido completo de `exc.errors()` porque puede incluir inputs sensibles.

Mapear solo información pública necesaria:

~~~text
loc → field
msg → issue
~~~

## 70. Tokens

Nunca exponer `token_hash`.

El access token aparece únicamente en `AccessTokenResponse`.

El token público de invitación existe como secreto de URL y no se loguea completo.

---

# PARTE XII — DECISIONES CONGELADAS

## 71. Decisiones

1. Request schemas y response schemas son distintos.
2. Pydantic no es Domain ni ORM.
3. Mutation requests usan `extra="forbid"`.
4. No existe stripping global de strings.
5. `from_attributes=True` no habilita serialización ORM directa.
6. UUID usa UUIDv4.
7. Version es entero >= 1.
8. Datetimes son timezone-aware y se emiten en UTC.
9. Dinero usa Decimal y JSON string decimal.
10. Requests monetarios no dependen de float.
11. Enums se serializan como strings.
12. Email sigue la semántica del Value Object compartido.
13. Password usa SecretStr.
14. PATCH usa `model_fields_set` / `exclude_unset=True`.
15. Campos PATCH no-nullable rechazan null explícito.
16. EditarArticulo requiere al menos un cambio además de version.
17. `imagenes=[]` elimina imágenes; `imagenes=null` es inválido.
18. En PATCH, imágenes enviadas reemplazan la colección completa.
19. Crear/editar artículo no recibe negocio_id.
20. Editar artículo no recibe tipo ni estado.
21. Editar categoría no recibe estado.
22. Comandos de estado reciben version, no estado libre.
23. Accept/reject por token no requiere body.
24. Promover propietario no recibe rol libre.
25. `MiembroResponse.id` es `usuario_negocio.id`.
26. Claves normalizadas y hashes no aparecen en API.
27. PageResponse es el envelope común.
28. Query filters usan allowlists.
29. Estado repetible permite activos + inactivos sin inventar TODOS.
30. Imagen input y response son schemas distintos.
31. CapacidadesArticulo puede reutilizar un mismo shape por ser VO sin identidad.
32. Preparación es proyección derivada.

---

# PARTE XIII — DECISIONES DIFERIDAS

## 72. Diferidas

Permanecen abiertas:

- longitudes máximas definitivas de nombre, descripción, rubro y SKU;
- política exacta de password;
- algoritmo exacto de normalización de Email;
- algoritmo exacto de normalización de nombres/SKU;
- contenido futuro de preparación al crecer módulos;
- ArticuloResumenResponse si el volumen lo justifica;
- provider/shape definitivo de uploads;
- refresh tokens;
- OAuth/MFA;
- ETag/If-Match;
- Idempotency-Key.

Una IA no debe inventar límites funcionales distintos en cada schema.

Cuando se definan límites técnicos, se centralizan.

---

# PARTE XIV — CRITERIO DE ACEPTACIÓN

## 73. Criterio de aceptación

Los schemas son correctos si:

1. ningún request tenant-scoped acepta negocio_id del body;
2. ningún response expone hashes o claves normalizadas;
3. password nunca aparece en response;
4. IDs validan UUIDv4;
5. versions son >= 1;
6. dinero no usa float;
7. dinero se serializa como string;
8. datetimes tienen timezone;
9. mutaciones rechazan campos extra;
10. PATCH preserva omitido vs null;
11. PATCH de artículo no permite cambiar tipo;
12. PATCH de artículo no permite cambiar estado;
13. PATCH de categoría no permite cambiar estado;
14. categoria_id puede limpiarse con null;
15. sku puede limpiarse con null;
16. imágenes pueden limpiarse con [];
17. imagenes=null se rechaza;
18. máximo tres imágenes;
19. si hay imágenes existe exactamente una principal;
20. posiciones no se repiten;
21. crear Articulo nace ACTIVO sin recibir estado;
22. crear Categoria nace ACTIVA sin recibir estado;
23. promover propietario no acepta rol arbitrario;
24. invitación inicial no acepta PROPIETARIO;
25. aceptar/rechazar por token no confía en email/body;
26. page/page_size cumplen contrato;
27. estado repetible no inventa valores de enum;
28. MiembroResponse distingue membership ID de user ID;
29. mapper HTTP → Application es explícito;
30. defaults PATCH no se transforman accidentalmente en cambios;
31. RequestValidationError se puede mapear a ErrorResponse;
32. OpenAPI representa correctamente nullability y required;
33. cada schema puede testearse sin base de datos.

---

## 74. Organización sugerida en código

~~~text
src/app/api/schemas/
├── __init__.py
├── common.py
├── auth.py
├── organizacion.py
├── invitaciones.py
└── catalogo.py
~~~

No crear un archivo por cada DTO pequeño.

~~~text
common.py
→ PageResponse
→ ErrorResponse
→ FieldIssue
→ aliases compartidos

auth.py
→ RegistrarUsuarioRequest
→ LoginRequest
→ AccessTokenResponse
→ UsuarioResponse

organizacion.py
→ Negocio*
→ Miembro*
→ Preparacion*

invitaciones.py
→ Invitacion*

catalogo.py
→ Categoria*
→ Articulo*
→ CapacidadesArticuloSchema
→ ArticuloImagen*
~~~

---

## 75. Próximo paso

Con:

~~~text
contrato-api.md
+
endpoints.md
+
schemas-dto.md
~~~

la especificación HTTP del Bloque 1 queda suficientemente cerrada.

El siguiente bloque documental es:

~~~text
pruebas/bloque-1-fundacion/
├── casos-prueba.md
└── escenarios-e2e.md
~~~

Después de congelar pruebas puede iniciarse la implementación con menor ambigüedad.
