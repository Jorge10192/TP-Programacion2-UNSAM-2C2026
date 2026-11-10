# E2-7 T04 — Ubicaciones, equipo, invitaciones y asignaciones REAL

**Estado:** implementación en rama para validación; NO fusionada.  
**Base:** `main` `884fa56abac490d0ffde961426d0537357bff045` (T03 integrado).  
**Rama:** `feature/e2-7-t04-ubicaciones-equipo-invitaciones`.  
**Límite de cambios:** `plataforma-pyme/frontend`, este documento y workflow de frontend. Sin modificar backend, migraciones, datos DEMO ni pagos.

## 1. Qué se integra

| Pantalla | Endpoints REST reales | Protección |
|---|---|---|
| Empresa → Ubicaciones | `GET/POST /businesses/{id}/locations`, `PATCH /{location_id}`, `PATCH /{location_id}/status`, `PUT /{location_id}/primary` | Lectura de miembros activos; escritura solo titular/admin de empresa ACTIVA |
| Ubicación → Asignaciones | `GET /businesses/{id}/locations/{location_id}/assignments`; `PUT /{membership_id}` | Solo titular/admin. El miembro debe ser ENCARGADO/TRABAJADOR activo, del mismo tenant y la sede ACTIVA |
| Empresa → Equipo | `GET /businesses/{id}/memberships`, `PATCH /{membership_id}` | Ver equipo: titular/admin. Cambiar rol/estado: exclusivamente titular, sin modificar su propia membresía protegida |
| Equipo → Emitir invitación | `POST /businesses/{id}/invitations` | Titular/admin de empresa ACTIVA; solo roles propuestos ENCARGADO o TRABAJADOR |
| Mi perfil REAL → Aceptar invitación | `POST /invitations/accept` | Cuenta REAL destinataria autenticada; token opaco de invitación de exactamente 43 caracteres |

Todas las rutas anteriores viven bajo `/api/v1` y requieren Bearer **opaco** vigente, no JWT. Los cuerpos de petición usan los campos reales en los DTO de FastAPI, sin mezclar nombres/IDs de `demoStore`.

## 2. Navegación y acciones

Desde `/real/login` ingresás a `/real/perfil`. Desde Mis empresas seleccionás una empresa A o B y tenés:
- `/real/empresas/{business_id}/ubicaciones`: crear y consultar sedes, editar nombre/tipo/dirección/link Google Maps/capacidades, pausar/reactivar, elegir sede principal, consultar y gestionar asignaciones de encargados/trabajadores;
- `/real/empresas/{business_id}/equipo`: consultar integrantes y sus roles, titular cambia rol o estado de terceros; titular/admin emite invitación;
- `/real/invitaciones/aceptar`: el destinatario con su propia sesión pega el código y acepta la membresía; después aparece la empresa real en su cuenta.

**No se usa la DEMO como respaldo cuando falla FastAPI.** No se han conectado compras, inventario, ventas, caja, cuentas financieras ni documentos reales.

## 3. Seguridad y comportamiento de invitaciones

- El endpoint de emisión **no manda automáticamente correos electrónicos**: el titular debe entregar el código por canal seguro. No enviarlo al chat, capturas, repositorios ni logs.
- El código de invitación se recibe en el POST y se muestra **solo una vez** en la vista de emisión. No hay `GET` que lo recupere. Si se oculta, navega o se recarga, desaparece de React.
- El código no se persiste en `localStorage`/`sessionStorage`, ni se coloca en URL o query string. Se pega en un formulario tipo contraseña.
- El receptor debe tener cuenta propia con el email de destino y estar autenticado.
- Un POST puede confirmarse en PostgreSQL y perder la respuesta. No hay reintentos automáticos. En resultados inciertos se instruye a **consultar primero** el estado de la empresa/equipo antes de intentar otra escritura. Recuperación durable de intenciones sigue siendo T06.
- Cada ruta se forma con UUID validado; el backend exige pertenencia empresarial y permisos. Un botón oculto en React **no sustituye** los permisos del servidor.
- Los GET y resultados de escritura se ignoran si el componente fue desmontado por navegación/logout, y los datos de sedes/equipo no se reutilizan entre empresas A y B.

## 4. Advertencias de T03

Se corrigieron las dos causas señaladas en el log local de T03, sin agregar excepciones ni suprimir reglas de lint:
- `react(set-state-in-effect)`: se eliminó el `setLoading(...)` sincrónico del efecto de lectura de empresas. El estado inicial depende del tipo de ruta, y las respuestas de red actualizan el estado después.
- `react-hooks(exhaustive-deps)`: `go` y `onBusinessAuthLost` ahora son callbacks estables; el efecto declara `onUnauthorized` como dependencia.

La advertencia Vite de paquete JavaScript mayor de 500 kB se mantiene visible deliberadamente; es una optimización de bundle pendiente, no se cambia el umbral.

## 5. Validación en Windows, desde `plataforma-pyme/frontend`

```powershell
git pull --ff-only origin feature/e2-7-t04-ubicaciones-equipo-invitaciones

npm.cmd run test:api
if ($LASTEXITCODE -ne 0) { throw "Falló test:api" }
npm.cmd run test:auth
if ($LASTEXITCODE -ne 0) { throw "Falló test:auth" }
npm.cmd run test:businesses
if ($LASTEXITCODE -ne 0) { throw "Falló test:businesses" }
npm.cmd run test:operations-real
if ($LASTEXITCODE -ne 0) { throw "Falló test:operations-real" }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Falló build" }
npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw "Falló lint" }
```

Para probar desde navegador (usar **datos de prueba**; estas escrituras modifican la DB PostgreSQL Docker configurada):

```powershell
docker compose --profile api up -d --wait
$env:PYME_API_PROXY_TARGET = "http://127.0.0.1:18000"
npm.cmd run dev
```

Abrir `http://localhost:5173/real/login`. El token de login se conserva solo en memoria y **F5 obliga a iniciar sesión otra vez**, según T00.

## 6. QA guiado con TEST Empresa A / TEST Empresa B

| Escenario | Acción | Resultado esperado |
|---|---|---|
| T04-01 | Usuario titular ingresa a A → Ubicaciones y crea `Sede A TEST` | Se ve en A; no en B |
| T04-02 | En B crear `Sede B TEST` | Solo aparece en B |
| T04-03 | Editar sede A (dirección, tipo, capacidades) | Cambios persisten tras releer |
| T04-04 | Hacer principal sede A; pausarla; reactivarla | Principal único; pausa lo quita y bloquea operaciones no aptas |
| T04-05 | Abrir Equipo en A | Aparecen membresías reales, incluyendo titular |
| T04-06 | Emitir invitación para un segundo usuario de prueba como TRABAJADOR | La API devuelve código una sola vez; no se envía email automático |
| T04-07 | Logout; login como usuario destinatario; Aceptar invitación (código recibido) | A aparece en su lista de empresas, B no |
| T04-08 | Invitado TRABAJADOR abre A → Ubicaciones y Equipo | Puede leer sedes; no puede editar ni ver listado privado del equipo |
| T04-09 | Titular regresa a A, asigna trabajador a Sede A | Se guarda una asignación ACTIVA solo para A y esa sede |
| T04-10 | Titular revoca asignación | Se registra REVOCADA; no se altera B |
| T04-11 | Titular cambia rol o desactiva miembro tercero | Backend guarda cambio; titularidad protegida no puede editarse desde UI |
| T04-12 | Invitado intenta abrir URL de B | 404/no acceso; no contenido ni datos DEMO de B |
| T04-13 | Navegar A→B rápidamente; luego logout/F5 | No aparecen datos antiguos de A en B ni de sesión anterior |
| T04-14 | Usar código inválido y volver a aceptar uno consumido | Errores seguros 422/409; no elevación de privilegios |
| T04-15 | Abrir DEMO `/inicio` | Se mantiene independiente sin datos de usuario REAL |
| T04-16 | Pantallas móviles | Cards, selects, botones y paneles legibles y funcionales |

**Para probar invitaciones no reutilizar un correo activo en la empresa:** el backend rechaza miembros e invitaciones pendientes duplicados. No pegar el token en mensajes a asistentes ni capturas.

## 7. Evidencia y puerta de cierre

Se ampliaron las comprobaciones de GitHub Actions de frontend para ejecutar `test:api`, `test:auth`, `test:businesses` y `test:operations-real` además de compilación, lint y tests DEMO previos. El CI prueba contratos simulados; no sustituye pruebas de roles y tenant con dos usuarios y PostgreSQL.

**No fusionar T04** hasta que la rama actual supere CI y el equipo confirme los flujos principales de sedes, equipo, invitación/aceptación, asignación y aislamiento A/B con evidencia. Solo después arrancar T05 (catálogo real y paginación).
