"""
Health endpoint + optional upstream ping.
Optionally pings configured primary upstream via app.extensions.http_client to report reachability.
Returns 200 on healthy responses and 500 with error details on failures.
"""
from __future__ import annotations
import time

from flask import Blueprint, jsonify, current_app

from app.extensions import http_client

bp = Blueprint("health", __name__)

@bp.route("/health")
def health():
    tid = current_app.config.get("SERVICE_NAME", "r1-flask")
    try:
        health_status = {
            "status": "healthy",
            "service": tid,
            "version": current_app.config.get("VERSION", "1.0.0"),
            "timestamp": time.time(),
            "uptime": round(time.time() - getattr(current_app, "_start_time", time.time()), 2),
            "backend": {
                "primary": current_app.config.get("API_BASE") or "not-configured",
                "fallback": current_app.config.get("FALLBACK_API") or None,
            }
        }

        primary = current_app.config.get("API_BASE")
        if primary and http_client is not None:
            try:
                resp = http_client.request("GET", primary.rstrip("/") + "/api/articles?limit=1", timeout=3)
                health_status["backend"]["primary_status"] = "reachable" if resp.status_code < 500 else "degraded"
            except Exception:
                health_status["backend"]["primary_status"] = "unreachable"

        return jsonify(health_status), 200

    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500
