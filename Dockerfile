FROM python:3.11-slim

# Install system dependencies (ffmpeg for audio conversion, libgl for opencv)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsm6 libxext6 libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first (for Docker cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Generate datasets and train models during build
RUN python scripts/generate_cognitive_dataset_v2.py && \
    python scripts/generate_behavioral_data_v2.py && \
    python scripts/train_cognitive_model_v2.py && \
    python scripts/train_anomaly_model.py && \
    python scripts/download_models.py

# Pre-download InsightFace buffalo_l model so it doesn't download at runtime (causes OOM)
RUN python -c "import insightface; from insightface.app import FaceAnalysis; app = FaceAnalysis(name='buffalo_l', root='models/insightface', providers=['CPUExecutionProvider']); app.prepare(ctx_id=0, det_size=(640, 640)); print('[BUILD] InsightFace buffalo_l pre-loaded successfully')"

# Pre-download sentence-transformers model
RUN python -c "from sentence_transformers import SentenceTransformer; model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu'); print('[BUILD] Sentence-transformers model cached')"

# Expose port
ENV PORT=8080
EXPOSE 8080

# Start server
CMD uvicorn backend.main:app --host 0.0.0.0 --port $PORT
