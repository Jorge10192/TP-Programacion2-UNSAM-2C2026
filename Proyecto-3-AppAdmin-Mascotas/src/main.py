from fastapi import FastAPI


app = FastAPI(
    title="WALOS API",
    description="API para la gestión del emprendimiento WALOS",
    version="0.1.0",
)


@app.get("/health")
def health_check():
    return {"status": "ok"}