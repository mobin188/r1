#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="/var/www/r1"
RUNTIME_DIR="${APP_DIR}/runtime"
PREVIOUS_TAG_FILE="${RUNTIME_DIR}/previous-image-tag"

if [[ $# -gt 0 ]]; then
  IMAGE_TAG="$1"
else
  IMAGE_TAG="$(cat "$PREVIOUS_TAG_FILE" 2>/dev/null || true)"
fi

if [[ -z "${IMAGE_TAG:-}" ]]; then
  echo "No rollback image tag available."
  exit 1
fi

cd "$APP_DIR"
./scripts/deploy.sh "$IMAGE_TAG"
