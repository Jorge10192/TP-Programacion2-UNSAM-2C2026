FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home walos && mkdir /data && chown walos /data
COPY . .
USER walos
ENV DATABASE_URL=sqlite:////data/walos.db
EXPOSE 8000
CMD ["sh", "-c", "python -m alembic upgrade head && exec python -m uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
