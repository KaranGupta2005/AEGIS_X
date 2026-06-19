from fastapi import FastAPI

app = FastAPI(
    title="AEGIS-X",
    version="1.0"
)


@app.get("/")
def home():
    return {
        "status": "running",
        "project": "AEGIS-X"
    }
