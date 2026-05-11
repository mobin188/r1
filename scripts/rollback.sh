#!/usr/bin/env bash

set -Eeuo pipefail

if [[ $# -eq 0 ]]; then
    echo "Usage:"
    echo "./scripts/rollback.sh <image-tag>"
    exit 1
fi

IMAGE_TAG="$1"

echo "Rolling back to: ${IMAGE_TAG}"

./scripts/deploy.sh "${IMAGE_TAG}"
