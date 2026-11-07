# E1-D2 — E2E de navegador

Pruebas aisladas en Chromium de escritorio y móvil. Utilizan un contexto de navegador limpio por test; no leen ni sobrescriben los datos de `localStorage` / IndexedDB de tu equipo.

Requisitos: Node.js 22 o superior, npm, conexión a Internet para instalar Playwright/Chromium la primera vez.

Desde `plataforma-pyme/frontend`:

```powershell
npm.cmd ci
cd e2e
npm.cmd install
npx.cmd playwright install chromium
npm.cmd test
```

La configuración arranca Vite automáticamente si aún no está levantado. Para ejecutar solo escritorio: `npm.cmd test -- --project=desktop-chromium`. Para móvil: `npm.cmd test -- --project=mobile-chromium`.

Los tests prueban navegación, URLs ajenas, placeholders, drawer/foco/ESC, ausencia de desborde horizontal, aislamiento del catálogo, creación de QR, persistencia, cancelación y aprobación simulada sin ventas duplicadas. **No reemplazan** la QA de caja/stock con productos físicos ni simulan seguridad backend.

La carpeta `e2e/` tiene sus dependencias separadas para no alterar el paquete principal del frontend ni su lockfile.
