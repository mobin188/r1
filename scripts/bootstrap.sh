#!/usr/bin/env bash

set -Eeuo pipefail

# =========================================================
# R1 - One-Command VPS Bootstrap
# Ubuntu 24.04+
# =========================================================

APP_NAME="r1"
APP_DIR="/var/www/r1"
REPO_URL="https://github.com/mobin188/r1.git"

echo "======================================="
echo "R1 VPS Bootstrap"
echo "======================================="

# ---------------------------------------------------------
# Root check
# ---------------------------------------------------------

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

# ---------------------------------------------------------
# Apt setup
# ---------------------------------------------------------

export DEBIAN_FRONTEND=noninteractive

apt-get update

# ---------------------------------------------------------
# Remove conflicting compose packages
# ---------------------------------------------------------

apt-get remove -y docker-compose-v2 docker-compose-plugin || true

# ---------------------------------------------------------
# Base packages
# ---------------------------------------------------------

apt-get install -y \
  docker.io \
  git \
  curl \
  ufw \
  fail2ban

# ---------------------------------------------------------
# Docker service
# ---------------------------------------------------------

systemctl enable docker
systemctl restart docker

# ---------------------------------------------------------
# Install Docker Compose plugin manually
# (stable + avoids Ubuntu package conflicts)
# ---------------------------------------------------------

mkdir -p /usr/local/lib/docker/cli-plugins

COMPOSE_VERSION="v2.29.7"

curl -SL \
  "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose

chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

ln -sf \
  /usr/local/lib/docker/cli-plugins/docker-compose \
  /usr/local/bin/docker-compose

# ---------------------------------------------------------
# Firewall
# ---------------------------------------------------------

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp

ufw --force enable

# ---------------------------------------------------------
# Fail2ban
# ---------------------------------------------------------

systemctl enable fail2ban
systemctl restart fail2ban

# ---------------------------------------------------------
# App directory
# ---------------------------------------------------------

mkdir -p /var/www

# ---------------------------------------------------------
# Fresh clone
# ---------------------------------------------------------

if [ -d "$APP_DIR/.git" ]; then
  echo "Existing repository detected"
  cd "$APP_DIR"

  git fetch origin
  git reset --hard origin/main
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

# ---------------------------------------------------------
# Environment bootstrap
# ---------------------------------------------------------

if [ ! -f ".env" ]; then
  cp .env.example .env
fi

# ---------------------------------------------------------
# Docker cleanup
# ---------------------------------------------------------

docker system prune -af || true

# ---------------------------------------------------------
# Docker network setup
# ---------------------------------------------------------
if ! docker network inspect mobin-network >/dev/null 2>&1; then
    docker network create mobin-network
fi

# ---------------------------------------------------------
# Build + start
# ---------------------------------------------------------

docker compose pull || true
docker compose up -d --build

# ---------------------------------------------------------
# Health output
# ---------------------------------------------------------

echo
echo "======================================="
echo "Bootstrap complete"
echo "======================================="

docker ps

echo
echo "Application directory:"
echo "$APP_DIR"

echo
echo "Useful commands:"
echo "cd $APP_DIR"
echo "docker compose logs -f"
echo "docker compose ps"
