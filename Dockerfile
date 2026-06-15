# === Builder stage ===
FROM python:3.11-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# === Final runtime stage ===
FROM python:3.11-slim

# Create non-root user
RUN groupadd -r app && useradd -r -g app -d /app -s /sbin/nologin app

WORKDIR /app

# Copy venv from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code with correct ownership
COPY --chown=app:app . .

# Switch to non-root
USER app

EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
    CMD python -c "
import urllib.request
import sys
try:
    urllib.request.urlopen('http://localhost:5000/health', timeout=8)
except Exception as e:
    print('Healthcheck failed:', e, file=sys.stderr)
    sys.exit(1)
" || exit 1

CMD ["gunicorn", "--config", "gunicorn_config.py", "wsgi:app"]
