# === Builder stage (installs gcc + compiles packages) ===
FROM python:3.11-slim AS builder

WORKDIR /app

# Create venv and install dependencies (cached if requirements.txt unchanged)
COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# === Final runtime stage (slim, no gcc) ===
FROM python:3.11-slim

WORKDIR /app

# Copy only the virtual environment from builder (much smaller & faster)
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy your app code
COPY . .

EXPOSE 5000

# For development (hot reload) we'll override this in docker-compose
CMD ["gunicorn", "--config", "gunicorn_config.py", "wsgi:app"]
