"""
InsightFace Face Verification & Enrollment Provider
=====================================================
Production face recognition using InsightFace's buffalo_l model.

Model: buffalo_l (ArcFace, 512-dim face embeddings)
Performance: LFW 99.83%, CFP-FP 99.00%
Latency: ~100-200ms per image (CPU), ~30-60ms (GPU)

Features:
- Face detection (RetinaFace)
- Face alignment (5-point landmarks)
- 512-dim face embedding extraction
- Cosine similarity matching
- Multi-face handling (picks largest face)
- Low quality / poor lighting detection
"""

import io
import time
import numpy as np
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from backend.services.providers.interfaces import (
    IFaceVerificationProvider,
    IFaceEnrollmentProvider,
    VerificationResult,
    EnrollmentResult,
    ResultStatus,
)

# Lazy loading
_insightface_app = None
_insightface_loaded = False


def _load_insightface():
    """Lazy-load InsightFace model (first call ~3s, then cached)."""
    global _insightface_loaded, _insightface_app
    if _insightface_loaded:
        return _insightface_app

    try:
        import insightface
        from insightface.app import FaceAnalysis

        _insightface_app = FaceAnalysis(
            name="buffalo_l",
            root="models/insightface",
            providers=["CPUExecutionProvider"],  # Use CUDAExecutionProvider for GPU
        )
        _insightface_app.prepare(ctx_id=0, det_size=(640, 640))
        _insightface_loaded = True
        print("[AEGIS-X] InsightFace buffalo_l loaded successfully.")
        return _insightface_app
    except ImportError as e:
        import os
        face_url = os.getenv("AEGISX_FACE_SERVICE_URL", "")
        if face_url:
            print(f"[AEGIS-X] InsightFace not local — will proxy to face service: {face_url}")
            _insightface_loaded = True
            _insightface_app = "PROXY"
            return _insightface_app
        raise RuntimeError(f"InsightFace not installed: {e}")
    except Exception as e:
        import os
        face_url = os.getenv("AEGISX_FACE_SERVICE_URL", "")
        if face_url:
            print(f"[AEGIS-X] InsightFace load failed — will proxy to face service: {face_url}")
            _insightface_loaded = True
            _insightface_app = "PROXY"
            return _insightface_app
        raise RuntimeError(f"Failed to load InsightFace: {e}")


def _bytes_to_cv2(image_data: bytes) -> np.ndarray:
    """Convert image bytes to OpenCV BGR numpy array."""
    import cv2
    nparr = np.frombuffer(image_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image — invalid or corrupted data")
    return img


def _compute_image_quality(img: np.ndarray) -> float:
    """Estimate face image quality (lighting, blur, resolution)."""
    import cv2

    # Laplacian variance (blur detection)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    blur_score = min(1.0, laplacian_var / 500.0)  # 500+ = sharp

    # Brightness check
    mean_brightness = np.mean(gray) / 255.0
    brightness_score = 1.0 - abs(mean_brightness - 0.5) * 2  # Optimal ~0.5

    # Resolution score
    h, w = img.shape[:2]
    res_score = min(1.0, min(h, w) / 200.0)  # 200px+ = good

    quality = blur_score * 0.4 + brightness_score * 0.3 + res_score * 0.3
    return float(np.clip(quality, 0.0, 1.0))



# ═══════════════════════════════════════════════════════════════════════════════
# INSIGHTFACE VERIFICATION PROVIDER
# ═══════════════════════════════════════════════════════════════════════════════

class InsightFaceVerificationProvider(IFaceVerificationProvider):
    """
    Production face verification using InsightFace ArcFace (buffalo_l).
    Implements IFaceVerificationProvider interface exactly.
    """

    SIMILARITY_THRESHOLD = 0.45   # InsightFace uses normed embeddings; 0.45+ = same person
    MIN_FACE_SIZE = 40            # Minimum face bbox pixels

    @property
    def provider_name(self) -> str:
        return "insightface_buffalo_l"

    def verify_face(
        self,
        image_data: bytes,
        enrolled_embedding: Any,
    ) -> VerificationResult:
        """Verify face identity against enrolled template."""
        t_start = time.perf_counter()
        now = datetime.now(timezone.utc).isoformat()

        try:
            img = _bytes_to_cv2(image_data)
            quality = _compute_image_quality(img)

            if quality < 0.2:
                processing_ms = (time.perf_counter() - t_start) * 1000
                return VerificationResult(
                    verified=False, confidence=0.0, latency_ms=processing_ms,
                    quality=quality, processing_time_ms=processing_ms,
                    reason="Image quality too low — poor lighting or excessive blur",
                    status=ResultStatus.FAILURE, timestamp=now, provider_name=self.provider_name,
                )

            # Detect and analyze faces
            app = _load_insightface()
            faces = app.get(img)

            if len(faces) == 0:
                processing_ms = (time.perf_counter() - t_start) * 1000
                return VerificationResult(
                    verified=False, confidence=0.0, latency_ms=processing_ms,
                    quality=quality, processing_time_ms=processing_ms,
                    reason="No face detected in image",
                    status=ResultStatus.FAILURE, timestamp=now, provider_name=self.provider_name,
                )

            if len(faces) > 1:
                # Multiple faces — pick largest (closest to camera)
                faces = sorted(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)

            face = faces[0]
            bbox_w = face.bbox[2] - face.bbox[0]
            bbox_h = face.bbox[3] - face.bbox[1]

            if bbox_w < self.MIN_FACE_SIZE or bbox_h < self.MIN_FACE_SIZE:
                processing_ms = (time.perf_counter() - t_start) * 1000
                return VerificationResult(
                    verified=False, confidence=0.0, latency_ms=processing_ms,
                    quality=quality, processing_time_ms=processing_ms,
                    reason=f"Face too small ({bbox_w:.0f}x{bbox_h:.0f}px) — move closer to camera",
                    status=ResultStatus.FAILURE, timestamp=now, provider_name=self.provider_name,
                )

            # Extract 512-dim embedding
            embedding = face.normed_embedding  # Already L2-normalized by InsightFace

            if enrolled_embedding is None:
                processing_ms = (time.perf_counter() - t_start) * 1000
                return VerificationResult(
                    verified=False, confidence=0.0, latency_ms=processing_ms,
                    quality=quality, processing_time_ms=processing_ms,
                    reason="No enrolled face template available for comparison",
                    status=ResultStatus.FAILURE, timestamp=now, provider_name=self.provider_name,
                )

            # Cosine similarity
            enrolled = np.array(enrolled_embedding, dtype=np.float32).flatten()
            enrolled_norm = np.linalg.norm(enrolled)
            if enrolled_norm > 0:
                enrolled = enrolled / enrolled_norm

            similarity = float(np.dot(embedding, enrolled))
            similarity = np.clip(similarity, -1.0, 1.0)

            verified = similarity >= self.SIMILARITY_THRESHOLD
            processing_ms = (time.perf_counter() - t_start) * 1000

            if verified:
                reason = f"Face verified — identity match (similarity={similarity:.4f})"
            else:
                reason = f"Face mismatch (similarity={similarity:.4f}, threshold={self.SIMILARITY_THRESHOLD})"

            return VerificationResult(
                verified=verified,
                confidence=max(0.0, (similarity - 0.2) / 0.6),  # Normalize to 0-1 range
                latency_ms=processing_ms,
                quality=quality,
                processing_time_ms=processing_ms,
                reason=reason,
                status=ResultStatus.SUCCESS,
                timestamp=now,
                provider_name=self.provider_name,
                metadata={
                    "similarity": round(similarity, 6),
                    "threshold": self.SIMILARITY_THRESHOLD,
                    "embedding_dim": 512,
                    "faces_detected": len(faces),
                    "face_det_score": round(float(face.det_score), 4),
                    "model": "ArcFace buffalo_l",
                },
            )

        except ValueError as e:
            processing_ms = (time.perf_counter() - t_start) * 1000
            return VerificationResult(
                verified=False, confidence=0.0, latency_ms=processing_ms,
                quality=0.0, processing_time_ms=processing_ms,
                reason=f"Image error: {str(e)}",
                status=ResultStatus.ERROR, timestamp=now, provider_name=self.provider_name,
            )
        except Exception as e:
            processing_ms = (time.perf_counter() - t_start) * 1000
            # Try face service proxy as fallback
            import os
            face_url = os.getenv("AEGISX_FACE_SERVICE_URL", "")
            if face_url:
                try:
                    import httpx
                    import base64
                    resp = httpx.post(
                        f"{face_url}/face/verify",
                        json={"image_base64": base64.b64encode(image_data).decode(), "user_id": "demo_user"},
                        timeout=45.0,
                    )
                    data = resp.json()
                    return VerificationResult(
                        verified=data.get("match", False),
                        confidence=data.get("confidence", 0.0),
                        latency_ms=data.get("latency_ms", processing_ms),
                        quality=0.8, processing_time_ms=processing_ms,
                        reason=data.get("reason", "Face service proxy"),
                        status=ResultStatus.SUCCESS if data.get("match") else ResultStatus.FAILED,
                        timestamp=now, provider_name="insightface_buffalo_l_proxy",
                    )
                except Exception as proxy_err:
                    print(f"[AEGIS-X FACE] Proxy also failed: {proxy_err}")
            return VerificationResult(
                verified=False, confidence=0.0, latency_ms=processing_ms,
                quality=0.0, processing_time_ms=processing_ms,
                reason=f"Face verification error: {str(e)}",
                status=ResultStatus.ERROR, timestamp=now, provider_name=self.provider_name,
            )


# ═══════════════════════════════════════════════════════════════════════════════
# INSIGHTFACE ENROLLMENT PROVIDER
# ═══════════════════════════════════════════════════════════════════════════════

class InsightFaceEnrollmentProvider(IFaceEnrollmentProvider):
    """Production face enrollment using InsightFace."""

    MIN_QUALITY = 0.35

    @property
    def provider_name(self) -> str:
        return "insightface_buffalo_enrollment"

    def enroll_face(self, image_samples: List[bytes]) -> EnrollmentResult:
        """Create a face template from enrollment images."""
        t_start = time.perf_counter()
        now = datetime.now(timezone.utc).isoformat()

        if not image_samples:
            return EnrollmentResult(
                enrolled=False, confidence=0.0, quality=0.0,
                processing_time_ms=0, reason="No image samples provided",
                status=ResultStatus.FAILURE, timestamp=now, provider_name=self.provider_name,
            )

        try:
            embeddings = []
            qualities = []

            for sample in image_samples:
                emb = self.get_embedding(sample)
                if emb is not None:
                    img = _bytes_to_cv2(sample)
                    quality = _compute_image_quality(img)
                    qualities.append(quality)
                    if quality >= self.MIN_QUALITY:
                        embeddings.append(emb)

            if not embeddings:
                processing_ms = (time.perf_counter() - t_start) * 1000
                return EnrollmentResult(
                    enrolled=False, confidence=0.0,
                    quality=float(np.mean(qualities)) if qualities else 0.0,
                    processing_time_ms=processing_ms,
                    reason="No valid face embeddings — faces not detected or quality too low",
                    status=ResultStatus.FAILURE, timestamp=now, provider_name=self.provider_name,
                )

            avg_quality = float(np.mean(qualities))
            processing_ms = (time.perf_counter() - t_start) * 1000

            return EnrollmentResult(
                enrolled=True,
                confidence=min(1.0, avg_quality * (len(embeddings) / len(image_samples))),
                quality=avg_quality,
                processing_time_ms=processing_ms,
                reason=f"Face enrolled — {len(embeddings)}/{len(image_samples)} samples used",
                embedding_dimension=512,
                sample_count=len(embeddings),
                status=ResultStatus.SUCCESS,
                timestamp=now,
                provider_name=self.provider_name,
            )

        except Exception as e:
            processing_ms = (time.perf_counter() - t_start) * 1000
            return EnrollmentResult(
                enrolled=False, confidence=0.0, quality=0.0,
                processing_time_ms=processing_ms,
                reason=f"Face enrollment error: {str(e)}",
                status=ResultStatus.ERROR, timestamp=now, provider_name=self.provider_name,
            )

    def get_embedding(self, image_data: bytes) -> Optional[Any]:
        """Extract 512-dim face embedding from image."""
        try:
            img = _bytes_to_cv2(image_data)
            app = _load_insightface()
            faces = app.get(img)
            if not faces:
                return None
            # Pick largest face
            face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            return face.normed_embedding.astype(np.float32)
        except Exception:
            return None
