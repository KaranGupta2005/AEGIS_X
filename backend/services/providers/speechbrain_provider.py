"""
SpeechBrain ECAPA-TDNN Voice Verification Provider
====================================================
Production speaker verification using SpeechBrain's pre-trained ECAPA-TDNN model.

Model: speechbrain/spkrec-ecapa-voxceleb (192-dim speaker embeddings)
Performance: EER ~0.8% on VoxCeleb1 test set
Latency: ~200-400ms per utterance (CPU), ~50-100ms (GPU)

Features:
- Speaker embedding extraction (192-dim)
- Cosine similarity matching
- Replay detection via spectral flatness analysis
- Quality scoring based on SNR and speech activity
- Configurable thresholds
"""

import io
import time
import numpy as np
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

from backend.services.providers.interfaces import (
    IVoiceVerificationProvider,
    IVoiceEnrollmentProvider,
    VerificationResult,
    EnrollmentResult,
    ResultStatus,
)

# Lazy imports — only loaded when provider is instantiated
_speechbrain_loaded = False
_classifier = None


def _load_speechbrain():
    """Lazy-load the SpeechBrain ECAPA-TDNN model (first call ~5s, then cached)."""
    global _speechbrain_loaded, _classifier
    if _speechbrain_loaded:
        return _classifier

    try:
        from speechbrain.inference.speaker import EncoderClassifier
        import torchaudio  # noqa: F401 — required by speechbrain

        _classifier = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir="models/speechbrain_ecapa",
            run_opts={"device": "cpu"},  # Use "cuda" for GPU
        )
        _speechbrain_loaded = True
        print("[AEGIS-X] SpeechBrain ECAPA-TDNN loaded successfully.")
        return _classifier
    except ImportError as e:
        raise RuntimeError(
            f"SpeechBrain not installed. Run: pip install -r requirements-biometric.txt\n{e}"
        )
    except Exception as e:
        raise RuntimeError(f"Failed to load SpeechBrain model: {e}")


def _audio_bytes_to_tensor(audio_data: bytes):
    """Convert raw audio bytes (WAV) to a torch tensor."""
    import torch
    import torchaudio

    buffer = io.BytesIO(audio_data)
    waveform, sample_rate = torchaudio.load(buffer)

    # Resample to 16kHz if needed (ECAPA-TDNN expects 16kHz)
    if sample_rate != 16000:
        resampler = torchaudio.transforms.Resample(sample_rate, 16000)
        waveform = resampler(waveform)

    # Convert to mono if stereo
    if waveform.shape[0] > 1:
        waveform = torch.mean(waveform, dim=0, keepdim=True)

    return waveform


def _compute_audio_quality(audio_data: bytes) -> float:
    """Compute audio quality score based on SNR and speech presence."""
    try:
        import numpy as np
        import io
        import soundfile as sf

        audio_np, sr = sf.read(io.BytesIO(audio_data))
        if len(audio_np.shape) > 1:
            audio_np = np.mean(audio_np, axis=1)

        # RMS energy
        rms = np.sqrt(np.mean(audio_np ** 2))
        if rms < 0.001:
            return 0.1  # Nearly silent

        # Estimate SNR (simple: ratio of speech frames to silence frames)
        frame_size = int(sr * 0.025)  # 25ms frames
        frames = [audio_np[i:i+frame_size] for i in range(0, len(audio_np) - frame_size, frame_size)]
        frame_energies = [np.sqrt(np.mean(f ** 2)) for f in frames]
        threshold = np.mean(frame_energies) * 0.3
        speech_ratio = sum(1 for e in frame_energies if e > threshold) / max(1, len(frame_energies))

        # Quality: combination of energy and speech presence
        quality = min(1.0, rms * 10) * 0.4 + speech_ratio * 0.6
        return float(np.clip(quality, 0.0, 1.0))
    except Exception:
        return 0.5  # Default on failure


def _detect_spectral_replay(audio_data: bytes) -> bool:
    """
    Detect replay attacks via spectral analysis.

    Real speech has natural spectral variation. Replayed audio from speakers
    shows characteristic compression artifacts, narrow bandwidth, and
    unnaturally high spectral flatness.
    """
    try:
        import numpy as np
        import io
        import soundfile as sf

        audio_np, sr = sf.read(io.BytesIO(audio_data))
        if len(audio_np.shape) > 1:
            audio_np = np.mean(audio_np, axis=1)

        # Compute spectral flatness (Wiener entropy)
        from scipy.signal import welch
        freqs, psd = welch(audio_np, fs=sr, nperseg=1024)

        # Spectral flatness = geometric mean / arithmetic mean of power spectrum
        psd_positive = psd[psd > 0]
        if len(psd_positive) < 10:
            return False

        log_mean = np.mean(np.log(psd_positive + 1e-10))
        geo_mean = np.exp(log_mean)
        arith_mean = np.mean(psd_positive)
        spectral_flatness = geo_mean / (arith_mean + 1e-10)

        # Bandwidth check — real speech typically spans 80Hz–8kHz
        # Replayed audio often has reduced high-frequency content
        high_freq_energy = np.sum(psd[freqs > 4000])
        total_energy = np.sum(psd) + 1e-10
        high_freq_ratio = high_freq_energy / total_energy

        # Replay indicators: high flatness + low high-frequency content
        is_replay = spectral_flatness > 0.6 and high_freq_ratio < 0.05
        return is_replay
    except Exception:
        return False  # Fail open on analysis error



# ═══════════════════════════════════════════════════════════════════════════════
# SPEECHBRAIN VOICE VERIFICATION PROVIDER
# ═══════════════════════════════════════════════════════════════════════════════

class SpeechBrainVoiceProvider(IVoiceVerificationProvider):
    """
    Production speaker verification using SpeechBrain ECAPA-TDNN.

    Implements IVoiceVerificationProvider interface exactly.
    No business logic changes required.
    """

    SIMILARITY_THRESHOLD = 0.75   # Cosine similarity threshold for match
    MIN_AUDIO_DURATION_S = 0.5    # Minimum utterance length

    @property
    def provider_name(self) -> str:
        return "speechbrain_ecapa_tdnn"

    def verify_speaker(
        self,
        audio_data: bytes,
        enrolled_embedding: Any,
        expected_phrase: Optional[str] = None,
    ) -> VerificationResult:
        """Verify speaker identity against enrolled voiceprint."""
        t_start = time.perf_counter()
        now = datetime.now(timezone.utc).isoformat()

        try:
            # Quality check
            quality = _compute_audio_quality(audio_data)
            if quality < 0.15:
                return VerificationResult(
                    verified=False, confidence=0.0, latency_ms=0,
                    quality=quality, processing_time_ms=(time.perf_counter() - t_start) * 1000,
                    reason="Audio quality too low — no speech detected or very noisy",
                    status=ResultStatus.FAILURE, timestamp=now, provider_name=self.provider_name,
                )

            # Extract embedding from input audio
            classifier = _load_speechbrain()
            waveform = _audio_bytes_to_tensor(audio_data)
            import torch
            with torch.no_grad():
                embedding = classifier.encode_batch(waveform)
                embedding = embedding.squeeze().cpu().numpy()

            # Normalize
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm

            # Compare with enrolled embedding
            if enrolled_embedding is None:
                processing_ms = (time.perf_counter() - t_start) * 1000
                return VerificationResult(
                    verified=False, confidence=0.0, latency_ms=processing_ms,
                    quality=quality, processing_time_ms=processing_ms,
                    reason="No enrolled voiceprint available for comparison",
                    status=ResultStatus.FAILURE, timestamp=now, provider_name=self.provider_name,
                )

            enrolled = np.array(enrolled_embedding, dtype=np.float32).flatten()
            enrolled_norm = np.linalg.norm(enrolled)
            if enrolled_norm > 0:
                enrolled = enrolled / enrolled_norm

            # Cosine similarity
            similarity = float(np.dot(embedding, enrolled))
            similarity = np.clip(similarity, -1.0, 1.0)

            verified = similarity >= self.SIMILARITY_THRESHOLD
            processing_ms = (time.perf_counter() - t_start) * 1000

            if verified:
                reason = f"Speaker verified — voiceprint match (similarity={similarity:.4f})"
            else:
                reason = f"Speaker mismatch (similarity={similarity:.4f}, threshold={self.SIMILARITY_THRESHOLD})"

            return VerificationResult(
                verified=verified,
                confidence=max(0.0, similarity),
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
                    "embedding_dim": 192,
                    "model": "ECAPA-TDNN (VoxCeleb)",
                },
            )

        except Exception as e:
            processing_ms = (time.perf_counter() - t_start) * 1000
            return VerificationResult(
                verified=False, confidence=0.0, latency_ms=processing_ms,
                quality=0.0, processing_time_ms=processing_ms,
                reason=f"Voice verification error: {str(e)}",
                status=ResultStatus.ERROR, timestamp=now, provider_name=self.provider_name,
            )

    def detect_replay(self, audio_data: bytes) -> bool:
        """Detect replay attack via spectral flatness analysis."""
        return _detect_spectral_replay(audio_data)


# ═══════════════════════════════════════════════════════════════════════════════
# SPEECHBRAIN VOICE ENROLLMENT PROVIDER
# ═══════════════════════════════════════════════════════════════════════════════

class SpeechBrainEnrollmentProvider(IVoiceEnrollmentProvider):
    """
    Production voice enrollment using SpeechBrain ECAPA-TDNN.
    Creates 192-dim speaker embeddings from audio samples.
    """

    MIN_SAMPLES = 1
    MIN_QUALITY = 0.3

    @property
    def provider_name(self) -> str:
        return "speechbrain_ecapa_enrollment"

    def enroll_voice(self, audio_samples: List[bytes]) -> EnrollmentResult:
        """Create a voiceprint from enrollment audio samples."""
        t_start = time.perf_counter()
        now = datetime.now(timezone.utc).isoformat()

        if len(audio_samples) < self.MIN_SAMPLES:
            return EnrollmentResult(
                enrolled=False, confidence=0.0, quality=0.0,
                processing_time_ms=(time.perf_counter() - t_start) * 1000,
                reason=f"Insufficient samples ({len(audio_samples)}). Need ≥{self.MIN_SAMPLES}.",
                status=ResultStatus.FAILURE, timestamp=now, provider_name=self.provider_name,
            )

        try:
            embeddings = []
            qualities = []

            for sample in audio_samples:
                quality = _compute_audio_quality(sample)
                qualities.append(quality)
                if quality < self.MIN_QUALITY:
                    continue

                emb = self.get_embedding(sample)
                if emb is not None:
                    embeddings.append(emb)

            if len(embeddings) == 0:
                processing_ms = (time.perf_counter() - t_start) * 1000
                return EnrollmentResult(
                    enrolled=False, confidence=0.0,
                    quality=float(np.mean(qualities)) if qualities else 0.0,
                    processing_time_ms=processing_ms,
                    reason="No valid embeddings extracted — audio quality insufficient",
                    status=ResultStatus.FAILURE, timestamp=now, provider_name=self.provider_name,
                )

            # Average all valid embeddings → centroid voiceprint
            centroid = np.mean(embeddings, axis=0)
            norm = np.linalg.norm(centroid)
            if norm > 0:
                centroid = centroid / norm

            avg_quality = float(np.mean(qualities))
            processing_ms = (time.perf_counter() - t_start) * 1000

            return EnrollmentResult(
                enrolled=True,
                confidence=min(1.0, avg_quality * (len(embeddings) / len(audio_samples))),
                quality=avg_quality,
                processing_time_ms=processing_ms,
                reason=f"Voice enrolled — {len(embeddings)}/{len(audio_samples)} samples used",
                embedding_dimension=192,
                sample_count=len(embeddings),
                status=ResultStatus.SUCCESS,
                timestamp=now,
                provider_name=self.provider_name,
                metadata={"centroid_stored": True},
            )

        except Exception as e:
            processing_ms = (time.perf_counter() - t_start) * 1000
            return EnrollmentResult(
                enrolled=False, confidence=0.0, quality=0.0,
                processing_time_ms=processing_ms,
                reason=f"Voice enrollment error: {str(e)}",
                status=ResultStatus.ERROR, timestamp=now, provider_name=self.provider_name,
            )

    def get_embedding(self, audio_data: bytes) -> Optional[Any]:
        """Extract 192-dim ECAPA-TDNN speaker embedding."""
        try:
            import torch
            classifier = _load_speechbrain()
            waveform = _audio_bytes_to_tensor(audio_data)
            with torch.no_grad():
                embedding = classifier.encode_batch(waveform)
                embedding = embedding.squeeze().cpu().numpy()
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            return embedding.astype(np.float32)
        except Exception:
            return None
