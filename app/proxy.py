"""
Proxy blueprint that forwards /api/* requests to configured upstream(s).
Uses the HTTPClient from app.extensions and the CircuitBreaker to manage upstream health.
"""
from __future__ import annotations
import time
from typing import Tuple, Optional

from flask import Blueprint, jsonify, request, Response, current_app
from werkzeug.datastructures import Headers

import app.extensions
from app.extensions import HTTPClient
from app.utils import clean_request_headers, trace_id, RESPONSE_EXCLUDED_HEADERS
from app.circuit import CircuitBreaker

bp = Blueprint("proxy", __name__)

# Circuit breaker instance per-process
circuit = CircuitBreaker(
    fail_threshold=int(current_app.config.get("FAIL_THRESHOLD", 3)) if current_app else 3,
    cooldown_sec=int(current_app.config.get("COOLDOWN_SEC", 10)) if current_app else 10,
)

def _pick_backend() -> Tuple[str, str]:
    """
    Determine which backend to use (primary/fallback). Based on backend health via a circuit-breaker.
    """
    primary = current_app.config.get("API_BASE", "").rstrip("/")
    fallback = current_app.config.get("FALLBACK_API", "").rstrip("/")
    if primary and circuit.is_available("primary"):
        return "primary", primary
    if fallback and circuit.is_available("fallback"):
        return "fallback", fallback

    # return primary (may be empty)
    return "primary", primary

def _build_url(base: str, path: str) -> str:
    return path if not base else f"{base.rstrip('/')}/{path.lstrip('/')}"

def _to_flask_response(upstream_response) -> Response:
    # Filter response headers to avoid hop-by-hop headers
    headers = Headers()
    for k, v in upstream_response.headers.items():
        if k.lower() in RESPONSE_EXCLUDED_HEADERS:
            continue
        headers.add(k, v)

    # RFC-compliant empty body responses
    if upstream_response.status_code in (204, 205, 304):
        return Response(status=upstream_response.status_code, headers=headers)

    # Return original raw content
    return Response(response=upstream_response.content, status=upstream_response.status_code, headers=headers)

@bp.route("/api", defaults={"path": ""}, methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS","HEAD"])
@bp.route("/api/<path:path>", methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS","HEAD"])
def proxy(path: str):
    # Acquire trace id
    tid = trace_id()

    backend_name, base = _pick_backend()
    url = _build_url(base, path)

    # Prepare headers: whitelist only
    headers = clean_request_headers(request.headers)
    headers["X-Request-ID"] = tid

    # Ensure we have an HTTP client
    client: Optional[HTTPClient] = app.extensions.http_client
    if client is None:
        current_app.logger.error("proxy: http_client not configured")
        return jsonify(error="HTTP client not configured", trace_id=tid), 500

    start = time.time()
    try:
        upstream = client.request(
            method=request.method,
            url=url,
            params=request.args,
            data=request.get_data(cache=True),
            headers=headers,
            timeout=(current_app.config.get("REQUEST_TIMEOUT", 3), current_app.config.get("REQUEST_TIMEOUT", 25)),
            allow_redirects=False,
        )

        latency = round(time.time() - start, 4)

        if upstream.status_code >= 500:
            circuit.record_failure(backend_name)
        else:
            circuit.record_success(backend_name)

        current_app.logger.info(
            "proxy_success trace_id=%s backend=%s status=%s latency=%s path=%s",
            tid, backend_name, upstream.status_code, latency, path
        )

        return _to_flask_response(upstream)

    except client.session.exceptions.Timeout:
        circuit.record_failure(backend_name)
        current_app.logger.warning("proxy_timeout trace_id=%s backend=%s path=%s", tid, backend_name, path)
        return jsonify(error="Upstream timeout", trace_id=tid), 504

    except Exception as exc:
        circuit.record_failure(backend_name)
        current_app.logger.exception("proxy_failure trace_id=%s backend=%s path=%s error=%s", tid, backend_name, path, exc)
        return jsonify(error="Upstream unavailable", trace_id=tid, details=str(exc)), 502
