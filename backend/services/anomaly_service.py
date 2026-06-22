"""
Anomaly Detection using Isolation Forest.

Standard unsupervised anomaly detection:
- Contamination = 0.05 (5% expected anomaly rate — conservative)
- n_estimators = 100 (standard for Isolation Forest)
- Auto-fits after collecting 50 normal samples
- Returns normalized anomaly_score in [0, 1]
"""

import numpy as np
from typing import Dict, Optional
from sklearn.ensemble import IsolationForest
from pathlib import Path
from joblib import dump, load


MODEL_DIR = Path(__file__).parent.parent.parent / "models" / "classifiers"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "isolation_forest.pkl"


class AnomalyService:

    def __init__(self):
        self._model: Optional[IsolationForest] = None
        self._sample_buffer: list = []
        self._min_samples = 50
        self._is_fitted = False

        if MODEL_PATH.exists():
            try:
                self._model = load(MODEL_PATH)
                self._is_fitted = True
            except Exception:
                self._model = None
                self._is_fitted = False

    def feed_sample(self, feature_vector: np.ndarray):
        """Add a sample to the buffer. Auto-fits after min_samples collected."""
        self._sample_buffer.append(feature_vector.copy())
        if len(self._sample_buffer) >= self._min_samples and not self._is_fitted:
            self._fit()

    def score_anomaly(self, feature_vector: np.ndarray) -> Dict:
        """Score a feature vector for anomaly. Returns 0.0 if not fitted yet."""
        if not self._is_fitted or self._model is None:
            return {"anomaly_score": 0.0, "is_anomaly": False, "confidence": 0.0}

        sample = feature_vector.reshape(1, -1)
        raw_score = self._model.decision_function(sample)[0]
        prediction = self._model.predict(sample)[0]

        # Normalize: raw_score is negative for anomalies, positive for normal
        # Map to [0, 1] where 1 = highly anomalous
        anomaly_score = max(0.0, min(1.0, -raw_score * 2.0))
        is_anomaly = bool(prediction == -1)

        return {
            "anomaly_score": round(float(anomaly_score), 4),
            "is_anomaly": is_anomaly,
            "raw_score": round(float(raw_score), 4),
            "confidence": round(min(1.0, len(self._sample_buffer) / 100.0), 2),
        }

    def _fit(self):
        """Fit the Isolation Forest on collected normal samples."""
        X = np.array(self._sample_buffer)
        self._model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )
        self._model.fit(X)
        self._is_fitted = True
        try:
            dump(self._model, MODEL_PATH)
        except Exception:
            pass

    def retrain(self, normal_samples: np.ndarray):
        """Retrain on provided samples."""
        self._model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )
        self._model.fit(normal_samples)
        self._is_fitted = True
        try:
            dump(self._model, MODEL_PATH)
        except Exception:
            pass

    @property
    def is_ready(self) -> bool:
        return self._is_fitted
