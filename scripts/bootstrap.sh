#!/usr/bin/env bash

set -e

echo "======================================="
echo "R1 VPS Bootstrap"
echo "======================================="

apt-get update

apt-get install -y \
    docker.io \
    docker-compose-v2 \
    git \
    curl \
    ufw \
    fail2ban

systemctl enable docker
systemctl start docker

mkdir -p /var/www/r1

ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

echo "======================================="
echo "Bootstrap complete"
echo "======================================="
