"""
AEGIS-X Anomaly Detection Model Training (Isolation Forest)
=============================================================
Trains the Isolation Forest on the V2 combined behavioral dataset.
Uses ONLY normal samples for training (unsupervised anomaly detection).

The model learns what "normal" looks like, then flags anything
that deviates significantly as anomalous.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.ensemble import IsolationForest
from joblib import dump

# Paths
DATA_PATH = Path(__file__).parent.parent / "data" / "synthetic" / "combined_behavioral_dataset.csv"
MODEL_DIR = Path(__file__).parent.parent / "models" / "classifiers"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "isolation_forest.pkl"

FEATURE_COLUMNS = [
    "typing_speed_cps", "typing_rhythm_variance", "typing_pressure_mean",
    "swipe_velocity_mean", "swipe_velocity_variance", "swipe_straightness",
    "touch_duration_mean", "touch_duration_variance", "touch_area_mean",
    "hesitation_ratio", "hesitation_count", "correction_rate",
    "scroll_speed_mean", "gyroscope_variance",
    "session_time_elapsed", "interaction_intensity",
]


def main():
    print("=" * 70)
    print("  AEGIS-X: Isolation Forest Anomaly Model Training")
    print("=" * 70)
    print()

    if not DATA_PATH.exists():
        print(f"ERROR: Dataset not found at {DATA_PATH}")
        print("Run 'python scripts/generate_behavioral_data_v2.py' first.")
        return

    print(f"Loading dataset: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Total samples: {len(df):,}")
    print()

    # Train ONLY on normal samples (Isolation Forest is unsupervised on normal)
    df_normal = df[df["label"] == "normal"]
    print(f"Normal samples for training: {len(df_normal):,}")

    # Extract features
    missing = [c for c in FEATURE_COLUMNS if c not in df_normal.columns]
    if missing:
        print(f"ERROR: Missing columns: {missing}")
        return

    X_train = df_normal[FEATURE_COLUMNS].to_numpy()

    # Remove NaN/inf
    mask = np.isfinite(X_train).all(axis=1)
    X_train = X_train[mask]
    print(f"Valid training samples: {len(X_train):,}")
    print()

    # Train Isolation Forest
    # contamination=0.05: expect 5% of "normal" data to be borderline
    # This is conservative — real anomaly rate is higher in attack classes
    print("Training IsolationForest(n_estimators=150, contamination=0.05)...")
    model = IsolationForest(
        n_estimators=150,
        contamination=0.05,
        max_samples='auto',
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train)
    print("Training complete.")
    print()

    # Evaluate on different classes
    print("Anomaly detection rates by class:")
    print("-" * 50)
    for label in sorted(df["label"].unique()):
        subset = df[df["label"] == label][FEATURE_COLUMNS].to_numpy()
        mask_valid = np.isfinite(subset).all(axis=1)
        subset = subset[mask_valid]
        if len(subset) == 0:
            continue
        preds = model.predict(subset)
        # -1 = anomaly, 1 = normal
        anomaly_rate = (preds == -1).sum() / len(preds) * 100
        print(f"  {label:<30} anomaly rate: {anomaly_rate:>5.1f}%")

    print()

    # Save model
    dump(model, MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH.resolve()}")
    print(f"Model size: {MODEL_PATH.stat().st_size / 1024:.1f} KB")
    print()
    print("=" * 70)
    print("  Anomaly model training complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
