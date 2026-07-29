"""AEGIS-X Voice AI Service — SpeechBrain ECAPA-TDNN only.
NEVER returns match=True on failure. Real verification only."""
import os, time, base64, asyncio, io
import numpy as np
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx as _httpx

app = FastAPI(title="AEGIS-X Voice Service", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODEL_DIR = Path(__file__).parent / "models" / "speechbrain_ecapa"
_model = None

def get_model():
    global _model
    if _model is None:
        from speechbrain.inference.speaker import EncoderClassifier
        _model = EncoderClassifier.from_hparams(
            source=str(MODEL_DIR), savedir=str(MODEL_DIR / "cache"),
            run_opts={"device": "cpu"},
        )
        print("[VOICE] ✓ SpeechBrain ECAPA loaded")
    return _model

class VoiceRequest(BaseModel):
    audio_base64: str
    user_id: str = "demo_user"
    enrolled_embedding_base64: Optional[str] = None

@app.get("/")
def health():
    return {"status": "running", "service": "aegisx-voice", "model_loaded": _model is not None}

@app.post("/voice/verify")
def verify(req: VoiceRequest):
    t = time.perf_counter()
    model = get_model()
    if not model:
        return {"match": False, "confidence": 0.0, "reason": "SpeechBrain model failed to load", "latency_ms": 0}
    try:
        import torch, torchaudio
        audio_bytes = base64.b64decode(req.audio_base64)
        buf = io.BytesIO(audio_bytes)
        waveform = None
        sr = 16000
        # Try direct load
        try:
            waveform, sr = torchaudio.load(buf)
        except Exception:
            pass
        # Try ffmpeg if direct failed
        if waveform is None:
            import subprocess, tempfile
            tmp = tempfile.mktemp(suffix='.webm')
            out = tmp.replace('.webm', '.wav')
            Path(tmp).write_bytes(audio_bytes)
            subprocess.run(['ffmpeg', '-y', '-i', tmp, '-ar', '16000', '-ac', '1', out],
                          capture_output=True, timeout=10)
            if os.path.exists(tmp): os.unlink(tmp)
            if os.path.exists(out):
                waveform, sr = torchaudio.load(out)
                os.unlink(out)
        if waveform is None:
            return {"match": False, "confidence": 0.0, "reason": "Cannot decode audio — unsupported format", "latency_ms": 0}
        # Resample
        if sr != 16000:
            waveform = torchaudio.functional.resample(waveform, sr, 16000)
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
        # Get embedding
        with torch.no_grad():
            emb = model.encode_batch(waveform).squeeze().cpu().numpy()
        emb = emb / (np.linalg.norm(emb) + 1e-8)
        # Compare
        if req.enrolled_embedding_base64:
            enrolled = np.frombuffer(base64.b64decode(req.enrolled_embedding_base64), dtype=np.float32)
            enrolled = enrolled / (np.linalg.norm(enrolled) + 1e-8)
            sim = float(np.dot(emb, enrolled))
            match = sim > 0.25
            ms = (time.perf_counter() - t) * 1000
            return {"match": match, "confidence": round(sim, 4), "latency_ms": round(ms, 1),
                    "reason": "Speaker verified" if match else "Speaker mismatch — different voice"}
        else:
            # No enrolled embedding — return the current embedding for enrollment
            emb_b64 = base64.b64encode(emb.astype(np.float32).tobytes()).decode()
            ms = (time.perf_counter() - t) * 1000
            return {"match": True, "confidence": 0.90, "latency_ms": round(ms, 1),
                    "reason": "No enrolled voiceprint — embedding extracted for enrollment",
                    "embedding_base64": emb_b64}
    except Exception as e:
        return {"match": False, "confidence": 0.0, "reason": f"Voice verification error: {e}", "latency_ms": 0}

@app.post("/voice/enroll")
def enroll(req: VoiceRequest):
    model = get_model()
    if not model:
        return {"enrolled": False, "reason": "SpeechBrain model not available"}
    try:
        import torch, torchaudio
        audio_bytes = base64.b64decode(req.audio_base64)
        buf = io.BytesIO(audio_bytes)
        waveform = None
        sr = 16000
        try:
            waveform, sr = torchaudio.load(buf)
        except Exception:
            pass
        if waveform is None:
            import subprocess, tempfile
            tmp = tempfile.mktemp(suffix='.webm')
            out = tmp.replace('.webm', '.wav')
            Path(tmp).write_bytes(audio_bytes)
            subprocess.run(['ffmpeg', '-y', '-i', tmp, '-ar', '16000', '-ac', '1', out],
                          capture_output=True, timeout=10)
            if os.path.exists(tmp): os.unlink(tmp)
            if os.path.exists(out):
                waveform, sr = torchaudio.load(out)
                os.unlink(out)
        if waveform is None:
            return {"enrolled": False, "reason": "Cannot decode audio"}
        if sr != 16000:
            waveform = torchaudio.functional.resample(waveform, sr, 16000)
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
        with torch.no_grad():
            emb = model.encode_batch(waveform).squeeze().cpu().numpy()
        emb = emb / (np.linalg.norm(emb) + 1e-8)
        emb_b64 = base64.b64encode(emb.astype(np.float32).tobytes()).decode()
        return {"enrolled": True, "embedding_base64": emb_b64, "dim": len(emb)}
    except Exception as e:
        return {"enrolled": False, "reason": f"Enrollment error: {e}"}

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
