# Contenedor aislado de API; la base se ejecuta en Compose como servicio db.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# El contexto excluye .env, .venv, imagenes y archivos locales (.dockerignore).
COPY . /app
RUN python -m pip install --no-cache-dir .

# No ejecutar el servicio web como root.
USER 10001:10001

EXPOSE 8000

# Salud de proceso independiente de PostgreSQL (readiness: GET /ready).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "from urllib.request import urlopen; r = urlopen('http://127.0.0.1:8000/health', timeout=3); exit(0 if r.status == 200 else 1)"

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
