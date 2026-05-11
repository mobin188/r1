#!/usr/bin/env bash

set -Eeuo pipefail

IMAGE_TAG="${1:-latest}"

echo "Deploying image tag: ${IMAGE_TAG}"

export IMAGE_TAG

docker compose -f docker-compose.prod.yml pull

docker compose -f docker-compose.prod.yml up -d

echo "Waiting for health check..."

for i in {1..20}; do
    STATUS=$(docker inspect \
        --format='{{json .State.Health.Status}}' \
        r1-web 2>/dev/null || true)

    if [[ "$STATUS" == "\"healthy\"" ]]; then
        echo "Deployment successful"
        exit 0
    fi

    sleep 2
done

echo "Deployment failed"

docker compose -f docker-compose.prod.yml logs --tail=50

exit 1
