"""
AEGIS-X Cognitive State Model Training
========================================
Trains a Random Forest classifier (200 estimators) on the synthetic cognitive
behavioral dataset to classify 6 cognitive states:

    calm, focused, distressed, panicked, coerced, robotic

Model: RandomForestClassifier
    - n_estimators=200
    - max_depth=12
    - min_samples_leaf=5
    - class_weight='balanced'
    - random_state=42

Input: data/synthetic/cognitive_training_data.csv
Output: models/cognitive/cognitive_rf.pkl
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from joblib import dump

# Paths
DATA_PATH = Path(__file__).parent.parent / "data" / "synthetic" / "cognitive_training_data.csv"
MODEL_DIR = Path(__file__).parent.parent / "models" / "cognitive"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "cognitive_rf.pkl"

# Feature columns (must match dataset generation order)
FEATURE_COLUMNS = [
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

# Expected states
STATES = ["calm", "coerced", "distressed", "focused", "panicked", "robotic"]


def main():
    print("=" * 70)
    print("  AEGIS-X: Cognitive State Model Training")
    print("=" * 70)
    print()

    # ─── Load Data ─────────────────────────────────────────────────────────
    if not DATA_PATH.exists():
        print(f"ERROR: Dataset not found at {DATA_PATH}")
        print("Run 'python scripts/generate_cognitive_dataset.py' first.")
        return

    print(f"Loading dataset: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Total samples: {len(df):,}")
    print(f"Features: {FEATURE_COLUMNS}")
    print(f"States found: {sorted(df[LABEL_COLUMN].unique().tolist())}")
    print()

    # Validate columns
    missing_cols = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing_cols:
        print(f"ERROR: Missing columns: {missing_cols}")
        return
    if LABEL_COLUMN not in df.columns:
        print(f"ERROR: Missing label column '{LABEL_COLUMN}'")
        return

    X = df[FEATURE_COLUMNS].to_numpy()
    y = df[LABEL_COLUMN].to_numpy()

    # ─── Train/Test Split ──────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Training set: {len(X_train):,} samples")
    print(f"Test set:     {len(X_test):,} samples")
    print()

    # ─── Train Random Forest ───────────────────────────────────────────────
    print("Training RandomForestClassifier(n_estimators=200, max_depth=12, "
          "min_samples_leaf=5, class_weight='balanced')...")
    print()

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    print("Training complete.")
    print()

    # ─── Evaluate ──────────────────────────────────────────────────────────
    train_accuracy = model.score(X_train, y_train)
    test_accuracy = model.score(X_test, y_test)
    print(f"Training accuracy: {train_accuracy:.4f}")
    print(f"Test accuracy:     {test_accuracy:.4f}")
    print()

    # Cross-validation
    print("5-fold cross-validation...")
    cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")
    print(f"CV scores: {cv_scores.round(4)}")
    print(f"CV mean:   {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print()

    # Classification report
    y_pred = model.predict(X_test)
    print("Classification Report:")
    print("-" * 70)
    print(classification_report(y_test, y_pred, digits=4))

    # Confusion matrix
    print("Confusion Matrix:")
    print("-" * 70)
    cm = confusion_matrix(y_test, y_pred, labels=sorted(df[LABEL_COLUMN].unique()))
    labels = sorted(df[LABEL_COLUMN].unique())
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

    # Feature importance
    print("Feature Importance:")
    print("-" * 70)
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    for idx in sorted_idx:
        bar = "█" * int(importances[idx] * 40)
        print(f"  {FEATURE_COLUMNS[idx]:<28} {importances[idx]:.4f}  {bar}")
    print()

    # ─── Save Model ────────────────────────────────────────────────────────
    dump(model, MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH.resolve()}")
    print(f"Model classes: {model.classes_.tolist()}")
    print(f"Model size: {MODEL_PATH.stat().st_size / 1024:.1f} KB")
    print()

    # ─── Quick Inference Test ──────────────────────────────────────────────
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

    for name, features in test_cases:
        prediction = model.predict([features])[0]
        probabilities = model.predict_proba([features])[0]
        max_prob = max(probabilities)
        status = "✓" if prediction.lower() in name.lower() or \
                        (name == "ROBOTIC (bot)" and prediction == "robotic") else "?"
        print(f"  {status} {name:<18} → {prediction:<12} (confidence: {max_prob:.3f})")
    print()

    print("=" * 70)
    print("  Cognitive model training complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
