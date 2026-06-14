#!/usr/bin/env bash
# =============================================================================
# r1 - Single Command Bootstrap Script for Production VPS
# Run this once on a fresh Ubuntu server: curl -fsSL https://... | sudo bash
# =============================================================================

set -Eeuo pipefail

APP_DIR="/var/www/r1"
APP_USER="r1-app"
RUNTIME_DIR="${APP_DIR}/runtime"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [BOOTSTRAP] $*"
}

log "=== Starting r1 Production Bootstrap ==="

# Update system
log "Updating system packages..."
apt-get update && apt-get upgrade -y

# Install dependencies
log "Installing required packages..."
apt-get install -y curl git nginx docker.io docker-compose-plugin

# Start and enable Docker
log "Configuring Docker..."
systemctl enable --now docker
usermod -aG docker "${SUDO_USER:-$USER}"

# Create dedicated app user
if ! id "$APP_USER" &>/dev/null; then
    log "Creating application user: $APP_USER"
    useradd -r -s /sbin/nologin -d "$APP_DIR" "$APP_USER"
fi

# Clone or update repository
log "Setting up application directory..."
mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
    git clone https://github.com/mobin188/r1.git "$APP_DIR"
else
    log "Repository already exists, pulling latest..."
    cd "$APP_DIR" && git pull origin main
fi

chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
# Set execute permissions
log "Setting execute permissions on deployment scripts..."
chmod +x "$APP_DIR/scripts/"*.sh

# Create runtime directory...

# Create runtime directory for slots
mkdir -p "$RUNTIME_DIR"
chown -R "$APP_USER":"$APP_USER" "$RUNTIME_DIR"

# Configure Nginx for Blue/Green
log "Setting up Nginx reverse proxy..."
cat > /etc/nginx/sites-available/r1 << 'EOF'
server {
    listen 80;
    server_name _;

    # Proxy to active Blue/Green backend
    include /var/www/r1/runtime/nginx-upstream.conf;

    location / {
        proxy_pass $r1_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
EOF

# Enable site and create default upstream
ln -sf /etc/nginx/sites-available/r1 /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

cat > "$RUNTIME_DIR/nginx-upstream.conf" << 'EOF'
# Auto-generated upstream - will be updated by deploy.sh
set $r1_backend http://127.0.0.1:5000;
EOF

nginx -t && systemctl restart nginx

# Initial deployment (this will start the first container)
log "Performing initial deployment..."
sudo -u "$APP_USER" -H bash -lc "cd '$APP_DIR' && ./scripts/deploy.sh latest"

log "✅ Bootstrap completed successfully!"
log "The application is now running and will auto-deploy on every push to main."
echo ""
echo "================================================================"
echo "Next Steps:"
echo "1. Add GitHub Secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY"
echo "2. Push changes to main → automatic deployment"
echo "================================================================"
