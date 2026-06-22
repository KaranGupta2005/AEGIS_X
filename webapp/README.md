# AEGIS-X Web App Demo

A standalone mini banking application that demonstrates the AEGIS-X SDK integration.

## How It Works

1. Opens a WebSocket connection to the AEGIS-X backend
2. Captures your REAL keyboard behavior (typing speed, corrections, hesitations)
3. Sends behavioral features to the backend every 2 seconds
4. Backend runs the full 11-step trust pipeline
5. Shows live trust score, cognitive state, and decision
6. Transaction is ALLOWED/BLOCKED based on your actual behavioral biometrics

## Run

```bash
# Terminal 1: Start backend
cd AEGIS_X
pip install sentence-transformers  # first time only
python scripts/train_cognitive_model.py  # first time only
uvicorn backend.main:app --reload --port 8000

# Terminal 2: Serve webapp
cd AEGIS_X/webapp
python -m http.server 5000
# Open http://localhost:5000
```

## Architecture

```
Browser (webapp/index.html)
    │
    ├── Captures: keystrokes, corrections, pauses, timing
    │
    ├── Every 2s: extracts 16 behavioral features
    │
    └── WebSocket → ws://localhost:8000/ws/{userId}
                        │
                        ▼
                  AEGIS-X Backend
                  (full 11-step pipeline)
                        │
                        ▼
                  Trust Response → Updates UI
```

## Demo Scenarios

- **Normal typing**: Trust stays >90%, transaction ALLOWED
- **Nervous typing** (many corrections, pauses): Trust drops to 60-85%, STEP-UP required
- **Coerced** (very slow, long pauses): Trust drops <60%, transaction BLOCKED
- **Select "NEW" beneficiary** + high amount: Increases fraud probability
