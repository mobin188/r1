#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="/var/www/r1"

echo "======================================="
echo "R1 Production Deploy"
echo "======================================="

cd "$APP_DIR"

echo "[1/6] Pulling latest GitHub changes..."
git fetch origin main
git reset --hard origin/main

echo "[2/6] Pulling latest GHCR image..."
docker compose -f docker-compose.prod.yml pull

echo "[3/6] Starting updated containers..."
docker compose -f docker-compose.prod.yml up -d

echo "[4/6] Cleaning unused Docker resources..."
docker image prune -af

echo "[5/6] Waiting for healthcheck..."
sleep 10

echo "[6/6] Verifying container health..."

if ! docker ps | grep -q "(healthy)"; then
    echo "Deployment failed: container unhealthy"
    exit 1
fi

echo "======================================="
echo "Deploy completed successfully"
echo "======================================="
