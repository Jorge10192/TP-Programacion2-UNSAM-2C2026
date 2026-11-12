# E3-2A — Guía de pruebas manuales Windows (preparada, aún NO ejecutada)

**Estado:** lista de verificación para ejecutar con el usuario después de la auditoría técnica.
**PR:** #65, rama `feature/e3-2a-imagenes-real-backend`.
**IMPORTANTE:** este documento no autoriza ni ejecuta migraciones sobre la base local habitual. No usar la base comercial/educativa actual para la QA de carga.

## 0. Preparación aislada y segura

La prueba automatizada en GitHub Actions utiliza PostgreSQL 16 efímero con `PYME_DISPOSABLE_QA=1`. La validación manual se hará en **otra instancia Docker con proyecto Compose y puerto diferenciados**. No editar `main` ni el repositorio principal para probar el PR. No utilizar `docker compose down -v`, `reset --hard`, ni borrar archivos de terceros.

**Primera terminal, solo código —** desde PowerShell, sin necesidad de credenciales:
```powershell
$repo = "C:\Users\Jorge\Desktop\Jorge\Programacion 2\TP Final\TP-Programacion2-UNSAM-2C2026"
$qa = Join-Path (Split-Path $repo -Parent) "TP-PyME-E3-2A-QA"
git -C "$repo" fetch origin
if (Test-Path -LiteralPath $qa) { throw "El destino QA ya existe. Revisá antes de continuar." }
git -C "$repo" worktree add --detach "$qa" origin/feature/e3-2a-imagenes-real-backend
git -C "$qa" log -1 --oneline
git -C "$repo" status -sb
```

**Preparación de Docker:**
- El volumen de datos debe ser NUEVO y aislado mediante `-p pyme-e32a-qa` (no reutilizar `asistente-pyme-e2`).
- Reservar un puerto libre, por ejemplo `55439`, distinto del puerto de la base principal `55432` y del PostgreSQL Windows `5432`. Confirmar que no haya servicio escuchando antes de empezar.
- Copiar **localmente**, sin mostrar su contenido ni subirla, la configuración de contraseña `plataforma-pyme/.env` existente hacia el worktree QA. El archivo está ignorado por Git. Si no existe, crear una contraseña privada siguiendo `.env.example` y no compartirla.
- Desde `$qa\plataforma-pyme`, con Docker Desktop iniciado, seleccionar el puerto y crear una instancia separada:

```powershell
$qaPyme = Join-Path $qa "plataforma-pyme"
if (Get-NetTCPConnection -LocalPort 55439 -State Listen -ErrorAction SilentlyContinue) {
    throw "Puerto 55439 ocupado. Elegí otro libre."
}
if (!(Test-Path -LiteralPath "$qaPyme\.env")) {
    Copy-Item -LiteralPath "$repo\plataforma-pyme\.env" -Destination "$qaPyme\.env" -ErrorAction Stop
}
Push-Location "$qaPyme"
$env:POSTGRES_HOST_PORT = "55439"
docker compose -p pyme-e32a-qa config --quiet
docker compose -p pyme-e32a-qa up -d db
docker compose -p pyme-e32a-qa ps
Pop-Location
```

**Backend de la QA — segunda terminal**. Confirmar que `/ready` sea saludable y que el `alembic current` sea `e32a_photo_assets (head)`. No ejecutar si se sospecha que la conexión apunta a otra base:
```powershell
$qaBackend = Join-Path $qa "plataforma-pyme\backend"
Set-Location "$qaBackend"
$env:POSTGRES_HOST_PORT = "55439"
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "55439"
$env:DB_USER = "pyme"
$env:DB_NAME = "asistente_pyme"
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
# Solo después de verificar Docker y la conexión aislada anterior:
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 18081
```

**Frontend de la QA — tercera terminal:**
```powershell
$qaFrontend = Join-Path $qa "plataforma-pyme\frontend"
Set-Location "$qaFrontend"
$env:PYME_API_PROXY_TARGET = "http://127.0.0.1:18081"
npm.cmd ci
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1 --port 5175 --strictPort
```
Abrir `http://127.0.0.1:5175/real/login`. No activar ventas REAL ni modificar la base de uso habitual. Verificar que el proxy envíe a `18081` y que `/ready` en esa API corresponda a la instancia QA. El servidor React por sí solo NO guarda fotos: requiere FastAPI + PostgreSQL migrado.

## 1. Casos manuales de aceptación

Cada caso debe registrar: **Aprobado / Falló / Observación / Captura**. Probar primero con cuenta nueva de titular, empresa nueva y datos de prueba (no usar fotografías personales sensibles). No comparar con tarjetas DEMO como fuente de verdad.

| ID | Sección | Acción en UI | Resultado esperado |
|---|---|---|---|
| M01 | Perfil | Cargar JPG, luego PNG transparente y reemplazar | Una sola foto persistente, avatar actualizado, transparencia conservada |
| M02 | Perfil | Cerrar sesión, iniciar de nuevo y consultar perfil | Persistencia en PostgreSQL; no hay sesión ni archivos en localStorage |
| M03 | Empresa | Cargar logo JPG/PNG/WebP | Imagen visible en Datos de la empresa y en Mis empresas |
| M04 | Empresa | Reemplazar logo y quitarlo | Logo cambia sin crear duplicados; al quitarlo reaparece marcador |
| M05 | Producto | Crear un artículo, subir 3 fotos | Se ven 3 imágenes en detalle y la primera como portada en catálogo |
| M06 | Producto | Agregar hasta 8 fotos y probar una novena | Interfaz avisa el límite; API no admite una novena |
| M07 | Producto | Eliminar la portada y agregar una foto nueva | Galería actualizada; observar la nueva selección de portada por posición |
| M08 | Servicio | Crear servicio sin inventario, cargar 2 fotos | Fotos cargadas sin inicializar stock ni alterar ventas |
| M09 | Proveedor | Crear proveedor, cargar una foto opcional | Foto visible en ficha y en listado; sin afectar compras |
| M10 | Proveedor | Reemplazar y eliminar su foto | Se actualiza y el registro comercial permanece intacto |
| M11 | POS | Abrir bienes y servicios fotografiados | Portadas correctas dentro de cada tarjeta; no crean una venta |
| M12 | Roles | Acceder como trabajador activo | Puede ver fotos de empresa/catálogo/proveedor, sin botón de carga o borrado |
| M13 | Tenants | Cambiar entre dos empresas distintas | No se ven ni editan imágenes de la otra empresa sin membresía |
| M14 | Seguridad | Intentar subir SVG, archivo falso y archivo >5 MB | Error comprensible; no se guarda ni muestra como imagen válida |
| M15 | Persistencia | Navegar a otra pantalla y volver | Se consulta imagen guardada, sin depender de estado DEMO |
| M16 | Móvil | Ajustar ventana a 390×844 y recorrer M01/M03/M05/M09/M11 | Tarjetas legibles, controles accesibles y sin desplazamiento horizontal |
| M17 | Accesibilidad | Navegar con Tab, usar selector y Quitar foto | Foco visible, títulos y errores identificables |
| M18 | Fallo de red | Simular pérdida de conexión durante carga y reconsultar | La UI no vuelve a subir automáticamente y permite verificar el estado |

**Evidencia sugerida:** captura de perfil, empresa con logo, galería de 3 y 8 fotos, proveedor con foto, tarjeta POS con portada, móvil 390 px y ejemplo de permiso de trabajador.

## 2. Criterios de salida

Para declarar E3-2A aprobada: CI vigente verde; `alembic check` verde en DB aislada; M01–M18 aprobados o desvíos documentados y resueltos según severidad; ninguna pérdida de aislamiento, ninguna escritura comercial accidental; aprobación explícita del usuario para merge. El modo DEMO y el resto de E3-1 deben seguir operativos.

**Cierre:** no fusionar a `main` en esta guía. La limpieza posterior del worktree se realiza solo cuando el usuario confirme que ya no necesita sus archivos y respaldos QA. Nunca ejecutar `git worktree remove --force` como primera opción.
