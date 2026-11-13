# E3-3 · Publicación de prueba (2 personas): Supabase + Render

**Estado:** preparación técnica en rama `feature/e3-3-supabase-public-qa`, no se desplegó ni se creó una cuenta externa.

## Alcance y decisiones
- Objetivo: dos navegadores/dispositivos diferentes, usuarios independientes, una sola base compartida y aislamiento multiempresa. Verificar también invitación y roles, operaciones POS reales con pagos declarados, inventario, catálogo y fotos.
- **Supabase = PostgreSQL solamente.** La identidad, sesiones, permisos y SQLAlchemy/Alembic siguen en FastAPI. No crear tablas manualmente en SQL Editor ni habilitar Supabase Auth o Data API desde el frontend.
- **Render = un Web Service Docker público** que construye React con Vite y sirve tanto React como FastAPI desde el mismo origen HTTPS. Evita CORS, dos proveedores de front y API, y configuraciones de proxy de Vite en producción.
- **Modo seguro:** `PYME_DISPOSABLE_QA=0` y todos los flags MP TEST/shared desactivados. No utilizar el vendedor ni QR TEST compartido en un sitio público. Se pueden probar catálogo, POS, pagos *declarados* e invitaciones; cobro oficial MP queda fuera de esta etapa.
- Fotos webp persistidas en `photo_assets`/PostgreSQL BYTEA por la aplicación, no en filesystem temporal de Render.
- Datos ficticios exclusivamente; no usar nombres, correos, contraseñas ni pagos reales en las pruebas. Este entorno no se considera apto para producción.

## 1. Crear un proyecto PostgreSQL nuevo (acción del propietario)
1. Entrar a https://supabase.com/dashboard y crear proyecto **nuevo** llamado `plataforma-pyme-qa-public` (el nombre es sugerido). Región del proyecto existente: us-west-2 (Oregón); configurar Render en oregon y una contraseña de base fuerte que se guarde **fuera del repositorio y del chat**.
2. En **Connect** elegir **Session pooler**, modo sesión, **puerto 5432**, para servidor Render IPv4. No copiar la conexión directa IPv6 de `db.<ref>.supabase.co`, ni Transaction pooler 6543. Ver docs oficiales: https://supabase.com/docs/guides/database/connecting-to-postgres.
3. De esa pantalla obtener exactamente **HOST**, **USER** (normalmente `postgres.<project-ref>`), **PORT=5432**, **DATABASE=postgres**, y la contraseña privada que eligió el propietario. El host del pooler no se infiere: copiarlo.
4. **Seguridad obligatoria ANTES de crear tablas**: en el dashboard de Supabase abrir **Data API → Integrations / Data API Settings** y desactivar **Enable Data API**. Este sistema NO usa `supabase-js`, REST ni GraphQL; todas las consultas pasan por FastAPI. Dejar el Data API habilitado podría exponer tablas del esquema `public` sin RLS, dependiendo de los grants del proyecto. Revisar además el ajuste **Automatically expose new tables** y mantenerlo desactivado. La conexión PostgreSQL directa/pooler seguirá funcionando. Documentación: https://supabase.com/docs/guides/api/securing-your-api.
5. No pegar la URL completa con la contraseña en tickets, capturas ni ChatGPT. Solo compartir confirmación de proyecto creado, región y, si es necesario, host sin credenciales.

## 2. Crear un Render Blueprint después del merge aprobado
1. Entrar a https://dashboard.render.com, conectar el repo `Jorge10192/TP-Programacion2-UNSAM-2C2026` y crear un Blueprint desde `render.yaml` (en la raíz del repo), **solo cuando esté en main**.
2. El Blueprint crea únicamente `plataforma-pyme-qa-public` en plan Free; no modifica el servicio `walos-api` previo ni crea base Render.
3. Cargar los secretos **en el formulario privado de Render**:
   - `DB_HOST`: host exacto del Session pooler.
   - `DB_USER`: usuario exacto del Session pooler.
   - `POSTGRES_PASSWORD`: contraseña del proyecto Supabase.
   - `DB_NAME=postgres`, `DB_PORT=5432`, `DB_SSLMODE=require` ya vienen definidos.
4. `Dockerfile.public` instala el backend, compila el frontend y ejecuta `alembic upgrade head` en el proyecto Supabase nuevo y vacío **antes** de iniciar uvicorn. En Render Free una instancia puede dormir; reiniciar no borra las tablas de Supabase. No apuntar jamás a la DB del TP local ni a una base existente.
5. Comprobar `https://<nombre-elegido>.onrender.com/health` -> `status:ok`, `/ready` -> `database:ok`; luego visitar `/real/registro`. La ruta `/` mantiene DEMO, que no registra datos reales.

## 3. Matriz de pruebas desde 2 navegadores
- **A (titular):** registrarse, crear Empresa A, añadir ubicación, artículo con precio, stock; crear venta POS de importe pequeño y pago declarado en QA.
- **B (independiente):** registrarse, crear Empresa B; debe ver **solo B**, sin catálogo, ventas, integrantes ni datos de A. Probar requests cruzados por API contra recursos de A (403/404).
- **Colaboración:** A invita a B (código/invitación), B acepta; con rol asignado y permisos correspondientes, B puede consultar/operar Empresa A sin perder el aislamiento de su empresa B. Cargar un artículo y verificar en navegador A que ambos ven el cambio tras refrescar.
- **Persistencia:** hacer F5, salir y volver a entrar, confirmar datos en ambos navegadores. El login puede requerirse nuevamente por diseño actual (token en memoria).
- **Fotos:** subir una foto y verla desde el otro dispositivo con acceso autorizado.
- **QR:** usar el QR identificador DEMO solo como información; no activar la caja compartida ni simular acreditaciones en el sitio público.

## 4. Riesgos y validaciones
- Render Free puede suspender el proceso tras inactividad y demorar el primer ingreso; está destinado a pruebas y no ofrece disponibilidad comercial.
- Supabase Free tiene límites de almacenamiento, tráfico, conexiones y posible pausado por inactividad; supervisar ambos paneles.
- Las llamadas al backend usan la misma URL HTTPS que la página. No publicar claves de base ni Access Tokens MP en variables `VITE_*`.
- **Bloqueo de salida**: no desplegar antes de verificar que el **Data API de Supabase esté desactivado**, para que las tablas de PostgreSQL del backend no sean consultables fuera de FastAPI.
- No se realiza migración de datos locales; el Supabase nuevo empieza vacío. Mantener intacta `asistente_pyme` y la base Docker QA local `asistente_pyme_mp_b7_20261113_013813`.
- Sin pruebas públicas de dos usuarios, **no** declarar publicación funcional ni merge de producción.

## 5. Reversión
Deshabilitar el Web Service desde Render, sin eliminar Supabase de inmediato. Conservar la base mientras se investiga. Eliminar secretos/instancias de QA después de la exposición y de la evaluación final.

## Fuentes
- Supabase: https://supabase.com/docs/guides/database/connecting-to-postgres
- Render Blueprint: https://render.com/docs/blueprint-spec
- Render Free: https://render.com/docs/free
