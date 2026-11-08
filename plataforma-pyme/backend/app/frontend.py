"""SPA del mismo origen. Ninguna ruta de API o archivo privado cae en index.html."""
import os
import re
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def mount_frontend(app):
    configured = os.environ.get('PYME_FRONTEND_DIR')
    if not configured:
        return
    root = Path(configured).resolve()
    if not (root / 'index.html').is_file():
        raise RuntimeError('PYME_FRONTEND_DIR no contiene la interfaz compilada')
    app.mount('/assets', StaticFiles(directory=root / 'assets'), name='frontend-assets')

    @app.get('/{path:path}', include_in_schema=False)
    def frontend(path: str):
        if path in {'icons.svg','favicon.svg'} and (root/path).is_file():
            return FileResponse(root/path)
        if path in {'','inicio','perfil','empresas/nueva'} or re.fullmatch(r'b/[0-9a-fA-F-]{36}/[a-z-]+',path):
            return FileResponse(root/'index.html',headers={'Cache-Control':'no-store'})
        raise HTTPException(404,'Ruta no disponible')
