"""
Proxy blueprint that forwards /api/* requests to configured upstreams.
Uses the session and CircuitBreaker from app.extensions.
"""
from __future__ import annotations
import time
from typing import Tuple

import httpx
from flask import Blueprint, jsonify, request, Response, current_app
from werkzeug.datastructures import Headers

import app.extensions
from app.utils import clean_request_headers, trace_id, RESPONSE_EXCLUDED_HEADERS

bp = Blueprint("proxy", __name__)


def _pick_backend() -> Tuple[str, str]:
    """
    Determine which backend to use (primary/fallback) based on circuit breaker state.
    Returns (backend_name, base_url).
    """
    primary = current_app.config.get("API_BASE", "").rstrip("/")
    fallback = current_app.config.get("FALLBACK_API", "").rstrip("/")
    circuit = app.extensions.circuit_breaker

    if primary and circuit.is_available("primary"):
        return "primary", primary
    if fallback and circuit.is_available("fallback"):
        return "fallback", fallback
    return "primary", primary


def _build_url(base: str, path: str) -> str:
    """Build full URL from base and path."""
    return f"{base.rstrip('/')}/{path.lstrip('/')}" if base else ""


def _to_flask_response(upstream_response: httpx.Response) -> Response:
    """Convert httpx.Response to Flask Response, filtering hop-by-hop headers."""
    headers = Headers()
    for k, v in upstream_response.headers.items():
        if k.lower() not in RESPONSE_EXCLUDED_HEADERS:
            headers.add(k, v)

    # RFC-compliant empty-body responses
    if upstream_response.status_code in (204, 205, 304):
        return Response(status=upstream_response.status_code, headers=headers)

    return Response(response=upstream_response.content, status=upstream_response.status_code, headers=headers)


@bp.route("/api", defaults={"path": ""}, methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
@bp.route("/api/<path:path>", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
def proxy(path: str):
    """Forward API request to configured upstream."""
    tid = trace_id()
    backend_name, base = _pick_backend()
    url = _build_url(base, path)

    if not base:
        current_app.logger.error("proxy: no upstream configured (trace_id=%s)", tid)
        return jsonify(error="Upstream not configured", trace_id=tid), 503

    headers = clean_request_headers(request.headers)
    headers["X-Request-ID"] = tid

    http_client = app.extensions.http_client
    circuit = app.extensions.circuit_breaker

    if http_client is None:
        current_app.logger.error("proxy: http_client not initialized (trace_id=%s)", tid)
        return jsonify(error="HTTP client not initialized", trace_id=tid), 500

    start = time.time()
    try:
        connect_timeout = current_app.config.get("REQUEST_TIMEOUT_CONNECT", 3)
        read_timeout = current_app.config.get("REQUEST_TIMEOUT_READ", 25)

        upstream = http_client.request(
            method=request.method,
            url=url,
            params=request.args,
            content=request.get_data(cache=True),
            headers=headers,
            timeout=httpx.Timeout(connect=connect_timeout, read=read_timeout, write=5.0, pool=5.0),
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

    except httpx.TimeoutException:
        circuit.record_failure(backend_name)
        current_app.logger.warning("proxy_timeout trace_id=%s backend=%s path=%s", tid, backend_name, path)
        return jsonify(error="Upstream timeout", trace_id=tid), 504

    except Exception as exc:
        circuit.record_failure(backend_name)
        current_app.logger.exception("proxy_failure trace_id=%s backend=%s path=%s", tid, backend_name, path)
        return jsonify(error="Upstream unavailable", trace_id=tid, details=str(exc)), 502
