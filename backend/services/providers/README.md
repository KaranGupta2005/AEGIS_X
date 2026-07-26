# AEGIS-X Biometric Verification Providers

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              ADAPTIVE VERIFICATION ENGINE                        │
│              (business logic — never imports AI)                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ uses interfaces only
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              PROVIDER INTERFACES (interfaces.py)                 │
│  IVoiceVerificationProvider  │  IFaceVerificationProvider        │
│  ILivenessProvider           │  IVoiceEnrollmentProvider         │
│  IFaceEnrollmentProvider     │  IDelegateVerificationProvider    │
└────────────────────────────┬────────────────────────────────────┘
                             │ implemented by
                             ▼
┌──────────────────┬──────────────────┬───────────────────────────┐
│  SPEECHBRAIN     │  INSIGHTFACE     │  MEDIAPIPE                │
│  ECAPA-TDNN      │  buffalo_l       │  Face Mesh                │
│  192-dim voice   │  512-dim face    │  468 landmarks            │
│  Speaker verify  │  Face verify     │  Liveness detection       │
│  Replay detect   │  Multi-face      │  Anti-spoofing            │
│  Quality scoring │  Quality scoring │  Action verification      │
└──────────────────┴──────────────────┴───────────────────────────┘
```

## Installation

```bash
# Full production install (downloads ~3-5GB of models on first run)
pip install -r requirements-biometric.txt

# Validate installation
python scripts/install_biometric_providers.py

# Run benchmarks
python scripts/benchmark_providers.py
```

## Provider Details

### Voice: SpeechBrain ECAPA-TDNN

- **File:** `speechbrain_provider.py`
- **Model:** `speechbrain/spkrec-ecapa-voxceleb`
- **Embedding:** 192-dimensional speaker vector
- **Performance:** EER ~0.8% on VoxCeleb1
- **Latency:** ~200-400ms (CPU), ~50-100ms (GPU)
- **Anti-replay:** Spectral flatness + bandwidth analysis
- **Quality:** SNR estimation + speech activity detection

### Face: InsightFace ArcFace

- **File:** `insightface_provider.py`
- **Model:** `buffalo_l` (ArcFace backbone)
- **Embedding:** 512-dimensional face vector
- **Performance:** LFW 99.83%, CFP-FP 99.00%
- **Latency:** ~100-200ms (CPU), ~30-60ms (GPU)
- **Features:** Face detection (RetinaFace), alignment, multi-face handling
- **Quality:** Blur detection (Laplacian), brightness, resolution scoring

### Liveness: MediaPipe Face Mesh

- **File:** `mediapipe_provider.py`
- **Model:** MediaPipe Face Mesh (468 3D landmarks)
- **Actions:** Blink, smile, head turn (L/R), nod, raise eyebrows
- **Anti-spoofing:** 3D depth consistency + texture gradient analysis
- **Latency:** ~50-150ms per frame
- **Rejection:** Static images, replay video attacks

## Adding a New Provider

1. Create a new file in `backend/services/providers/`
2. Implement the appropriate interface(s)
3. Register in the `_init_mock_providers()` method of `verification_engine.py`

Example:

```python
from backend.services.providers.interfaces import (
    IVoiceVerificationProvider, VerificationResult, ResultStatus
)

class MyCustomVoiceProvider(IVoiceVerificationProvider):

    @property
    def provider_name(self) -> str:
        return "my_custom_voice"

    def verify_speaker(self, audio_data, enrolled_embedding, expected_phrase=None):
        # Your AI logic here
        return VerificationResult(
            verified=True,
            confidence=0.92,
            latency_ms=150.0,
            quality=0.88,
            processing_time_ms=155.0,
            reason="Speaker verified via custom model",
            status=ResultStatus.SUCCESS,
            provider_name=self.provider_name,
        )

    def detect_replay(self, audio_data):
        # Your anti-replay logic
        return False
```

## Fallback Behavior

The verification engine automatically falls back to mock providers when
production AI libraries are not installed. This means:

- Development works without ML dependencies
- CI/CD pipelines run with mocks
- Production uses real providers when `requirements-biometric.txt` is installed
- No code changes needed — just install the packages

## Security

- **Never store raw audio/images** after embedding extraction
- Embeddings are stored as encrypted numpy arrays
- All verification operations are stateless (state in service layer)
- Rate limiting prevents brute-force attacks
- Anti-replay detection on all voice challenges
- Anti-spoofing on all face liveness checks

## Configuration

Thresholds are configurable in `backend/core/config.py`:

```python
VOICE_SIMILARITY_THRESHOLD = 0.75   # Cosine threshold for speaker match
FACE_SIMILARITY_THRESHOLD = 0.70    # Cosine threshold for face match
FACE_LIVENESS_CONFIDENCE = 0.80     # Minimum liveness confidence
VOICE_REPLAY_THRESHOLD = 0.85       # Above this → suspected replay
```
