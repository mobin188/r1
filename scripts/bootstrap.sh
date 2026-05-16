# ---------------------------------------------------------
# Runtime state
# ---------------------------------------------------------
mkdir -p "$APP_DIR/runtime"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

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
# Initial production deploy
# ---------------------------------------------------------
sudo -u "$APP_USER" -H bash -lc "cd '$APP_DIR' && ./scripts/deploy.sh latest"
