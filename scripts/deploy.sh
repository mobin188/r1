#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="/var/www/r1"
RUNTIME_DIR="${APP_DIR}/runtime"
ACTIVE_FILE="${RUNTIME_DIR}/active-slot"
CURRENT_TAG_FILE="${RUNTIME_DIR}/current-image-tag"
PREVIOUS_TAG_FILE="${RUNTIME_DIR}/previous-image-tag"
UPSTREAM_FILE="${RUNTIME_DIR}/nginx-upstream.conf"

BLUE_PORT=5000
GREEN_PORT=5001

IMAGE_TAG="${1:-${IMAGE_TAG:-latest}}"
DEPLOY_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ----------------------------- Functions -----------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DEPLOY] $*"
}

health_check() {
    local port=$1
    local max_attempts=15
    local attempt=1

    log "Running health check on port ${port}..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "http://127.0.0.1:${port}/health" > /dev/null; then
            log "✅ Health check passed on port ${port}"
            return 0
        fi
        log "Attempt ${attempt}/${max_attempts} failed, retrying in 2s..."
        sleep 2
        ((attempt++))
    done
    log "❌ Health check failed after ${max_attempts} attempts"
    return 1
}

# ----------------------------- Main -----------------------------
log "=== Starting Blue/Green deployment of tag: ${IMAGE_TAG} ==="

mkdir -p "$RUNTIME_DIR"
cd "$APP_DIR"

# Safer git sync (only pull if needed)
if ! git diff --quiet origin/main; then
    log "Syncing repository with remote..."
    git fetch origin main
    git reset --hard origin/main
else
    log "Repository already up to date."
fi

current_slot=$(cat "$ACTIVE_FILE" 2>/dev/null || echo "blue")
if [[ "$current_slot" == "blue" ]]; then
    target_slot="green"
    target_port="$GREEN_PORT"
else
    target_slot="blue"
    target_port="$BLUE_PORT"
fi

log "Current slot: ${current_slot} | Target slot: ${target_slot} (port ${target_port})"

# Save previous tag for potential rollback
if [[ -f "$CURRENT_TAG_FILE" ]]; then
    cp "$CURRENT_TAG_FILE" "$PREVIOUS_TAG_FILE"
fi

# Deploy new slot
log "Starting container for ${target_slot} slot..."
COMPOSE_PROJECT_NAME="r1-${target_slot}" \
HOST_PORT="$target_port" \
IMAGE_TAG="$IMAGE_TAG" \
docker compose -f docker-compose.prod.yml up -d --wait --force-recreate

# Health verification
if ! health_check "$target_port"; then
    log "❌ Deployment failed health check. Rolling back not implemented yet."
    # TODO: Add automatic rollback in future version
    exit 1
fi

# Update nginx upstream configuration
cat > "$UPSTREAM_FILE" <<EOF
# Auto-generated on ${DEPLOY_TIMESTAMP}
# Do not edit manually
set \$r1_backend http://127.0.0.1:${target_port};
EOF

# Switch active slot
echo "$target_slot" > "$ACTIVE_FILE"
echo "$IMAGE_TAG" > "$CURRENT_TAG_FILE"

log "✅ Deployment completed successfully!"
log "Active slot is now: ${target_slot}"
log "Nginx upstream file updated: ${UPSTREAM_FILE}"
log "Run: sudo nginx -s reload   (when ready to switch traffic)"

echo "------------------------------------------------------------"
echo "Deployment Summary:"
echo "   Tag      : ${IMAGE_TAG}"
echo "   Slot     : ${target_slot}"
echo "   Port     : ${target_port}"
echo "   Time     : ${DEPLOY_TIMESTAMP}"
echo "------------------------------------------------------------"
