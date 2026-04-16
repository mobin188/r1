# Use a slim Python image (matches your Ubuntu VPS later)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (if your app needs any, e.g., for certain packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the rest of the project (this gets overridden by volume in dev)
COPY . .

# Expose the port Flask runs on
EXPOSE 5000

# Use production WSGI entry by default (we'll override for dev)
CMD ["gunicorn", "--config", "gunicorn_config.py", "wsgi:app"]
