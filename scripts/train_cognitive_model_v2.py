"""
AEGIS-X Cognitive State Model V2 — HistGradientBoosting + Feature Engineering
===============================================================================
Replaces the V1 approach with:
1. HistGradientBoostingClassifier (memory efficient, great on overlap)
2. Engineered cross-features (compound signals)
3. No parallel cross-validation (avoids memory blow-up)
4. Same output format as V1 (backward compatible .pkl)

Target: >83% accuracy on the realistic 25K dataset with overlap
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer
from joblib import dump
import json

# Paths
DATA_PATH = Path(__file__).parent.parent / "data" / "synthetic" / "cognitive_training_data.csv"
MODEL_DIR = Path(__file__).parent.parent / "models" / "cognitive"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "cognitive_rf.pkl"  # Keep same name for backward compat
META_PATH = MODEL_DIR / "cognitive_model_meta.json"

# Base features (must match cognitive_service.py)
BASE_FEATURES = [
    "hesitation_ratio",
    "correction_rate",
    "typing_speed_cps",
    "typing_rhythm_variance",
    "touch_duration_mean",
    "gyroscope_variance",
    "interaction_intensity",
    "swipe_straightness",
]

LABEL_COLUMN = "label"
STATES = ["calm", "coerced", "distressed", "focused", "panicked", "robotic"]


def engineer_features(X: np.ndarray) -> np.ndarray:
    """
    Create cross-features that capture compound behavioral signals.
    Input: (n, 8) array with base features in canonical order.
    Output: (n, 14) array with 8 base + 6 engineered.
    """
    hesitation = X[:, 0]
    correction = X[:, 1]
    speed = X[:, 2]
    rhythm_var = X[:, 3]
    touch_dur = X[:, 4]
    gyro = X[:, 5]
    intensity = X[:, 6]
    straightness = X[:, 7]

    # Speed consistency: fast + low variance = robotic
    speed_consistency = speed / np.clip(rhythm_var / 50, 0.01, None)

    # Stress compound: all stress indicators elevated = severe
    stress_compound = hesitation * correction * np.clip(gyro * 20, 0.001, None)

    # Automation signal: speed × straightness / hesitation
    automation_signal = speed * straightness / np.clip(hesitation + 0.01, 0.01, None)

    # Human variability: normal humans have variance in all signals
    human_variability = rhythm_var / 50 + gyro * 20 + (1 - straightness) * 3

    # Interaction efficiency: intensity vs speed
    interaction_efficiency = intensity / np.clip(speed * 2, 1.0, None)

    # Freeze indicator: high hesitation + long touch + low activity
    freeze_indicator = hesitation * (touch_dur / 200) * (1 / np.clip(intensity, 1, None))

    engineered = np.column_stack([
        speed_consistency,
        stress_compound,
        automation_signal,
        human_variability,
        interaction_efficiency,
        freeze_indicator,
    ])

    return np.hstack([X, engineered])


ALL_FEATURES = BASE_FEATURES + [
    "speed_consistency",
    "stress_compound",
    "automation_signal",
    "human_variability",
    "interaction_efficiency",
    "freeze_indicator",
]


class CognitiveModelV2:
    """
    Wrapper that applies feature engineering then predicts.
    This is what gets saved as the .pkl — compatible with the existing
    cognitive_service.py that calls model.predict() and model.predict_proba().
    """

    def __init__(self, model):
        self._model = model
        self.classes_ = model.classes_
        self.feature_names_in_ = BASE_FEATURES

    def predict(self, X):
        X = np.atleast_2d(X)
        X_eng = engineer_features(X)
        X_eng = np.nan_to_num(X_eng, nan=0.0, posinf=100.0, neginf=-100.0)
        return self._model.predict(X_eng)

    def predict_proba(self, X):
        X = np.atleast_2d(X)
        X_eng = engineer_features(X)
        X_eng = np.nan_to_num(X_eng, nan=0.0, posinf=100.0, neginf=-100.0)
        return self._model.predict_proba(X_eng)


def main():
    print("=" * 70)
    print("  AEGIS-X: Cognitive State Model V2 Training")
    print("  (HistGradientBoosting + Feature Engineering)")
    print("=" * 70)
    print()

    # ─── Load Data ─────────────────────────────────────────────────────────
    if not DATA_PATH.exists():
        print(f"ERROR: Dataset not found at {DATA_PATH}")
        return

    print(f"Loading: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Total samples: {len(df):,}")
    print(f"Base features: {len(BASE_FEATURES)}")
    print()

    # Extract base features and engineer
    X_base = df[BASE_FEATURES].to_numpy()
    y = df[LABEL_COLUMN].to_numpy()
    X = engineer_features(X_base)
    X = np.nan_to_num(X, nan=0.0, posinf=100.0, neginf=-100.0)
    print(f"Total features: {X.shape[1]} (8 base + 6 engineered)")
    print()

    # ─── Train/Test Split ──────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Training: {len(X_train):,} | Test: {len(X_test):,}")
    print()

    # ─── Train HistGradientBoosting ────────────────────────────────────────
    print("Training HistGradientBoostingClassifier...")
    print("  max_iter=500, max_depth=8, learning_rate=0.06, l2=0.1")
    print("  min_samples_leaf=8, max_bins=128, class_weight='balanced'")
    print()

    model = HistGradientBoostingClassifier(
        max_iter=500,
        max_depth=8,
        min_samples_leaf=8,
        learning_rate=0.06,
        l2_regularization=0.1,
        max_bins=128,
        class_weight="balanced",
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=20,
    )
    model.fit(X_train, y_train)
    print(f"Training complete. Stopped at {model.n_iter_} iterations.")
    print()

    # ─── Evaluate ──────────────────────────────────────────────────────────
    train_acc = model.score(X_train, y_train)
    test_acc = model.score(X_test, y_test)
    print(f"Training accuracy: {train_acc:.4f}")
    print(f"Test accuracy:     {test_acc:.4f}")
    print()

    # Cross-validation (sequential, no parallel to avoid memory issues)
    print("5-fold cross-validation (sequential)...")
    kfold = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = []
    for fold_i, (train_idx, val_idx) in enumerate(kfold.split(X, y)):
        fold_model = HistGradientBoostingClassifier(
            max_iter=500,
            max_depth=8,
            min_samples_leaf=8,
            learning_rate=0.06,
            l2_regularization=0.1,
            max_bins=128,
            class_weight="balanced",
            random_state=42,
            early_stopping=True,
            validation_fraction=0.1,
            n_iter_no_change=20,
        )
        fold_model.fit(X[train_idx], y[train_idx])
        fold_score = fold_model.score(X[val_idx], y[val_idx])
        cv_scores.append(fold_score)
        print(f"  Fold {fold_i + 1}: {fold_score:.4f}")

    cv_scores = np.array(cv_scores)
    print(f"CV mean: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print()

    # Classification report
    y_pred = model.predict(X_test)
    print("Classification Report:")
    print("-" * 70)
    print(classification_report(y_test, y_pred, digits=4))

    # Confusion matrix
    print("Confusion Matrix:")
    print("-" * 70)
    labels = sorted(df[LABEL_COLUMN].unique())
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    print(f"{'':>12}", end="")
    for lbl in labels:
        print(f"{lbl:>10}", end="")
    print()
    for i, row_label in enumerate(labels):
        print(f"{row_label:>12}", end="")
        for val in cm[i]:
            print(f"{val:>10}", end="")
        print()
    print()

    # ─── Save Model (wrapped for backward compat) ─────────────────────────
    wrapped_model = CognitiveModelV2(model)

    # Quick inference test BEFORE saving
    print("Quick Inference Tests:")
    print("-" * 70)
    test_cases = [
        ("CALM user",     [0.08, 0.04, 3.8, 38.0, 120.0, 0.015, 8.0, 0.83]),
        ("FOCUSED user",  [0.04, 0.02, 4.5, 25.0, 90.0, 0.010, 12.0, 0.88]),
        ("DISTRESSED",    [0.30, 0.15, 2.5, 90.0, 180.0, 0.035, 5.0, 0.70]),
        ("PANICKED",      [0.55, 0.35, 1.2, 180.0, 320.0, 0.060, 3.0, 0.55]),
        ("COERCED",       [0.70, 0.45, 0.8, 250.0, 400.0, 0.085, 2.0, 0.45]),
        ("ROBOTIC (bot)", [0.01, 0.005, 9.5, 2.0, 45.0, 0.001, 25.0, 0.98]),
    ]

    all_pass = True
    for name, features in test_cases:
        prediction = wrapped_model.predict([features])[0]
        probabilities = wrapped_model.predict_proba([features])[0]
        max_prob = max(probabilities)
        expected = name.split()[0].lower().rstrip("(")
        if expected == "robotic":
            match = prediction == "robotic"
        else:
            match = expected in prediction.lower()
        status = "✓" if match else "✗"
        if not match:
            all_pass = False
        print(f"  {status} {name:<18} → {prediction:<12} (confidence: {max_prob:.3f})")
    print()

    if not all_pass:
        print("  WARNING: Not all inference tests pass. Model may have edge cases.")
        print()

    # Save
    dump(wrapped_model, MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH.resolve()}")
    print(f"Model size: {MODEL_PATH.stat().st_size / 1024:.1f} KB")

    # Save metadata
    meta = {
        "model_type": "HistGradientBoostingClassifier (wrapped)",
        "features": ALL_FEATURES,
        "base_features": BASE_FEATURES,
        "n_engineered_features": 6,
        "classes": STATES,
        "train_accuracy": round(train_acc, 4),
        "test_accuracy": round(test_acc, 4),
        "cv_mean": round(cv_scores.mean(), 4),
        "cv_std": round(cv_scores.std(), 4),
        "n_iterations": model.n_iter_,
        "training_samples": len(X_train),
        "test_samples": len(X_test),
    }
    META_PATH.write_text(json.dumps(meta, indent=2))
    print(f"Metadata saved to: {META_PATH}")
    print()
    print("=" * 70)
    print("  Cognitive model V2 training complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
