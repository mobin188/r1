#!/usr/bin/env bash
# =============================================================================
# r1 - Blue/Green Rollback Script
# =============================================================================

set -Eeuo pipefail

APP_DIR="/var/www/r1"
RUNTIME_DIR="${APP_DIR}/runtime"
ACTIVE_FILE="${RUNTIME_DIR}/active-slot"
CURRENT_TAG_FILE="${RUNTIME_DIR}/current-image-tag"
PREVIOUS_TAG_FILE="${RUNTIME_DIR}/previous-image-tag"
UPSTREAM_FILE="${RUNTIME_DIR}/nginx-upstream.conf"

BLUE_PORT=5000
GREEN_PORT=5001

log() {
    echo "[$(date '+%H:%M:%S')] [ROLLBACK] $*"
}

# Determine current and target slot
current_slot=$(cat "$ACTIVE_FILE" 2>/dev/null || echo "blue")
target_slot=$([[ "$current_slot" == "blue" ]] && echo "green" || echo "blue")
target_port=$([[ "$target_slot" == "blue" ]] && echo "$BLUE_PORT" || echo "$GREEN_PORT")

log "Rolling back from ${current_slot} to ${target_slot} (port ${target_port})"

# Check previous version exists
if [[ ! -f "$PREVIOUS_TAG_FILE" ]]; then
    log "❌ No previous tag found. Rollback aborted."
    exit 1
fi

previous_tag=$(cat "$PREVIOUS_TAG_FILE")

cd "$APP_DIR"

# Deploy previous version
log "Deploying previous version (${previous_tag})..."
COMPOSE_PROJECT_NAME="r1-${target_slot}" \
HOST_PORT="$target_port" \
IMAGE_TAG="$previous_tag" \
docker compose -f docker-compose.prod.yml up -d --wait --force-recreate

# Health check
if ! curl -s -f "http://127.0.0.1:${target_port}/health" > /dev/null; then
    log "❌ Health check failed after rollback. Aborting."
    exit 1
fi

log "✅ Health check passed."

# Switch traffic
cat > "$UPSTREAM_FILE" <<EOF
# Auto-generated - Rollback $(date '+%Y-%m-%d %H:%M:%S')
set \$r1_backend http://127.0.0.1:${target_port};
EOF

echo "$target_slot" > "$ACTIVE_FILE"
echo "$previous_tag" > "$CURRENT_TAG_FILE"

log "✅ Rollback completed successfully. Traffic switched to ${target_slot} slot."

echo "Run: sudo nginx -s reload"
