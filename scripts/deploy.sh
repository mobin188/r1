#!/usr/bin/env bash

set -e

cd /var/www/r1

docker compose pull || true

docker compose up -d --build

docker image prune -f
