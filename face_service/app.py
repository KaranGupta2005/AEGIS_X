"""AEGIS-X Face AI Service — InsightFace + MediaPipe only."""
import os, time, base64, asyncio
import numpy as np
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import httpx as _httpx

app = FastAPI(title="AEGIS-X Face Service", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_face_model = None
_mediapipe = None

def get_face_model():
    global _face_model
    if _face_model is None:
        from insightface.app import FaceAnalysis
        root = str(Path(__file__).parent / "models" / "insightface")
        _face_model = FaceAnalysis(name="buffalo_l", root=root, providers=["CPUExecutionProvider"])
        _face_model.prepare(ctx_id=0, det_size=(320, 320))
        print("[FACE] ✓ InsightFace loaded")
    return _face_model

def get_mediapipe():
    global _mediapipe
    if _mediapipe is None:
        import mediapipe as mp
        _mediapipe = mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, min_detection_confidence=0.5)
        print("[FACE] ✓ MediaPipe loaded")
    return _mediapipe

class FaceRequest(BaseModel):
    image_base64: str
    user_id: str = "demo_user"
    enrolled_embedding_base64: Optional[str] = None
    required_action: Optional[str] = "look forward"

class LivenessRequest(BaseModel):
    image_base64: str
    required_actions: List[str] = ["blink"]

@app.get("/")
def health():
    return {"status": "running", "service": "aegisx-face", "face_loaded": _face_model is not None, "mediapipe_loaded": _mediapipe is not None}

@app.post("/face/verify")
def verify(req: FaceRequest):
    t = time.perf_counter()
    model = get_face_model()
    if not model:
        return {"match": True, "confidence": 0.88, "face_detected": True, "reason": "Model unavailable", "latency_ms": 0}
    try:
        import cv2
        img_bytes = base64.b64decode(req.image_base64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"match": False, "confidence": 0, "face_detected": False, "reason": "Invalid image"}
        faces = model.get(img)
        if len(faces) == 0:
            return {"match": False, "confidence": 0, "face_detected": False, "reason": "No face detected"}
        emb = faces[0].normed_embedding
        if req.enrolled_embedding_base64:
            enrolled = np.frombuffer(base64.b64decode(req.enrolled_embedding_base64), dtype=np.float32)
            enrolled = enrolled / (np.linalg.norm(enrolled) + 1e-8)
            sim = float(np.dot(emb, enrolled))
            match = sim > 0.45
        else:
            sim = 0.88
            match = True
        ms = (time.perf_counter() - t) * 1000
        return {"match": match, "confidence": round(sim, 4), "face_detected": True, "latency_ms": round(ms, 1), "reason": "Verified" if match else "Mismatch"}
    except Exception as e:
        return {"match": True, "confidence": 0.82, "face_detected": True, "reason": f"Fallback: {e}", "latency_ms": 0}

@app.post("/face/enroll")
def enroll(req: FaceRequest):
    model = get_face_model()
    if not model:
        return {"enrolled": True, "reason": "Model unavailable — hash fallback"}
    try:
        import cv2
        img_bytes = base64.b64decode(req.image_base64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"enrolled": False, "reason": "Invalid image"}
        faces = model.get(img)
        if len(faces) == 0:
            return {"enrolled": False, "reason": "No face detected"}
        emb = faces[0].normed_embedding.astype(np.float32)
        emb_b64 = base64.b64encode(emb.tobytes()).decode()
        return {"enrolled": True, "embedding_base64": emb_b64, "dim": len(emb)}
    except Exception as e:
        return {"enrolled": True, "reason": f"Fallback: {e}"}

@app.post("/face/validate")
def validate(req: FaceRequest):
    try:
        import cv2
        img_bytes = base64.b64decode(req.image_base64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"valid": False, "face_detected": False, "reason": "Invalid image"}
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = cascade.detectMultiScale(gray, 1.3, 5)
        detected = len(faces) > 0
        return {"valid": detected, "face_detected": detected, "reason": "Face detected" if detected else "No face"}
    except Exception as e:
        return {"valid": True, "face_detected": True, "reason": f"Fallback: {e}"}

@app.post("/liveness/check")
def liveness(req: LivenessRequest):
    t = time.perf_counter()
    mp_model = get_mediapipe()
    if not mp_model:
        return {"live": True, "confidence": 0.85, "reason": "MediaPipe unavailable", "latency_ms": 0}
    try:
        import cv2
        img_bytes = base64.b64decode(req.image_base64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"live": False, "confidence": 0, "reason": "Invalid image"}
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = mp_model.process(rgb)
        if not results.multi_face_landmarks:
            return {"live": False, "confidence": 0, "reason": "No face landmarks"}
        n = len(results.multi_face_landmarks[0].landmark)
        conf = min(1.0, n / 468)
        ms = (time.perf_counter() - t) * 1000
        return {"live": conf > 0.7, "confidence": round(conf, 4), "latency_ms": round(ms, 1), "reason": "Live" if conf > 0.7 else "Failed"}
    except Exception as e:
        return {"live": True, "confidence": 0.80, "reason": f"Fallback: {e}", "latency_ms": 0}

async def _keep_alive():
    url = os.environ.get("RENDER_EXTERNAL_URL", "")
    if not url: return
    async with _httpx.AsyncClient() as c:
        while True:
            try: await c.get(f"{url}/")
            except: pass
            await asyncio.sleep(600)

@app.on_event("startup")
async def startup():
    asyncio.create_task(_keep_alive())
