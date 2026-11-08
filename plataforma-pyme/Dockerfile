FROM node:24-bookworm-slim AS frontend
WORKDIR /ui
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY frontend/ ./
ENV VITE_APP_MODE=api
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/ ./
RUN pip install --no-cache-dir . && useradd --create-home pyme
COPY --from=frontend /ui/dist /app/static
USER pyme
ENV PYME_FRONTEND_DIR=/app/static
EXPOSE 8000
CMD ["sh", "-c", "python -m alembic upgrade head && exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
