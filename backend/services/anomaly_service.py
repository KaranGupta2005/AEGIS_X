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
            self._model = load(MODEL_PATH)
            self._is_fitted = True

    def feed_sample(self, feature_vector: np.ndarray):
        self._sample_buffer.append(feature_vector)
        if len(self._sample_buffer) >= self._min_samples and not self._is_fitted:
            self._fit()

    def score_anomaly(self, feature_vector: np.ndarray) -> Dict:
        if not self._is_fitted or self._model is None:
            return {"anomaly_score": 0.0, "is_anomaly": False, "confidence": 0.0}

        sample = feature_vector.reshape(1, -1)
        raw_score = self._model.decision_function(sample)[0]
        prediction = self._model.predict(sample)[0]

        anomaly_score = max(0.0, min(1.0, -raw_score / 0.5))
        is_anomaly = prediction == -1

        return {
            "anomaly_score": round(float(anomaly_score), 4),
            "is_anomaly": is_anomaly,
            "raw_score": round(float(raw_score), 4),
            "confidence": round(min(1.0, len(self._sample_buffer) / 100.0), 2),
        }

    def _fit(self):
        X = np.array(self._sample_buffer)
        self._model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )
        self._model.fit(X)
        self._is_fitted = True
        dump(self._model, MODEL_PATH)

    def retrain(self, normal_samples: np.ndarray):
        self._model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )
        self._model.fit(normal_samples)
        self._is_fitted = True
        dump(self._model, MODEL_PATH)

    @property
    def is_ready(self) -> bool:
        return self._is_fitted
