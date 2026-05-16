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

mkdir -p "$RUNTIME_DIR"

cd "$APP_DIR"

# Keep the repo metadata and scripts in sync with the deployed branch.
git fetch origin main
git reset --hard origin/main

current_slot="$(cat "$ACTIVE_FILE" 2>/dev/null || echo blue)"

if [[ "$current_slot" == "blue" ]]; then
  target_slot="green"
  target_port="$GREEN_PORT"
else
  target_slot="blue"
  target_port="$BLUE_PORT"
fi

if [[ -f "$CURRENT_TAG_FILE" ]]; then
  cp "$CURRENT_TAG_FILE" "$PREVIOUS_TAG_FILE"
fi

echo "Deploying image tag: $IMAGE_TAG"
echo "Target slot: $target_slot on port $target_port"

COMPOSE_PROJECT_NAME="r1-${target_slot}" \
HOST_PORT="$target_port" \
IMAGE_TAG="$IMAGE_TAG" \
docker compose -f docker-compose.prod.yml up -d --wait

# Prepare a tiny runtime include file for the user's manual Nginx config.
cat > "$UPSTREAM_FILE" <<EOF
set \$r1_backend http://127.0.0.1:${target_port};
EOF

printf '%s\n' "$target_slot" > "$ACTIVE_FILE"
printf '%s\n' "$IMAGE_TAG" > "$CURRENT_TAG_FILE"

echo
echo "New slot is healthy."
echo "Runtime upstream file updated at: $UPSTREAM_FILE"
echo "If your Nginx site includes that file, reload Nginx when you're ready to switch traffic."
