# r1 - RealWorld Flask Proxy

A clean, production-ready Flask API proxy with a vanilla Web Components frontend for the RealWorld API specification.

## Features

- Thin, transparent API proxy with request tracing and failover readiness
- Modern vanilla Web Components frontend (no heavy frameworks)
- Blue/Green zero-downtime deployment strategy
- Fully automated CI/CD via GitHub Actions
- Security-first design (non-root container, proper secret handling)
- Single-command bootstrap for production VPS

## Quick Start (Local Development)

```bash
git clone https://github.com/mobin188/r1.git
cd r1

# Copy and configure environment variables
cp .env.example .env

# Start with Docker
docker compose up --build
Application will be available at http://localhost:5000
Production Deployment
1. Bootstrap (Run once on a fresh VPS)
Bashcurl -fsSL https://raw.githubusercontent.com/mobin188/r1/main/scripts/bootstrap.sh | sudo bash
2. Add GitHub Repository Secrets
Go to Settings → Secrets and variables → Actions and add:

VPS_HOST — Your VPS IP or domain
VPS_USER — SSH username (recommended: non-root)
VPS_SSH_KEY — Your private SSH key

3. Deploy
Every push to main automatically builds and deploys:
Bashgit push origin main
Available Scripts

scripts/bootstrap.sh — Initial VPS setup (one command)
scripts/deploy.sh — Blue/Green deployment
scripts/rollback.sh — Safe rollback to previous version

Project Structure
text├── .github/workflows/          # CI/CD pipelines
├── scripts/                    # Deployment & maintenance scripts
├── docker/                     # (if any)
├── static/                     # Frontend assets
├── templates/                  # Jinja templates
├── .env.example
├── Dockerfile                  # Multi-stage, non-root
├── docker-compose.prod.yml
├── gunicorn_config.py
└── README.md
Blue/Green Deployment

Two isolated environments (blue & green)
Traffic switched via Nginx
Health checks before traffic switch
Easy rollback capability

Tech Stack
Backend: Python + Flask + Gunicorn
Frontend: Vanilla JavaScript + Web Components
Infrastructure: Docker, Nginx, GitHub Actions, Blue/Green

Production Ready • Secure • Automated
text---

**Professional Commit Message** (use when committing):

```bash
docs: overhaul README.md for production-grade documentation

- Complete rewrite with clear deployment workflows
- Document new automated Blue/Green process
- Improve structure, readability and professionalism
- Align with Spotify-level project presentation
