"""
Small, cross-app utility helpers
"""
from __future__ import annotations
import uuid
from typing import Dict

from flask import request, g

# Headers allowed through the proxy (whitelist)
ALLOWED_REQUEST_HEADERS = {
    "accept",
    "accept-language",
    "authorization",
    "cache-control",
    "content-type",
    "if-none-match",
    "pragma",
    "user-agent",
    "x-request-id",
}

# Hop-by-hop headers excluded from responses (RFC 7230)
RESPONSE_EXCLUDED_HEADERS = {
    "host",
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "content-encoding",
}


def clean_request_headers(headers) -> Dict[str, str]:
    """
    Return a copy of headers with only whitelisted keys.

    Args:
        headers: Werkzeug Headers object from Flask request.

    Returns:
        Dict of filtered headers suitable for upstream requests.
    """
    return {k: v for k, v in headers.items() if k.lower() in ALLOWED_REQUEST_HEADERS}


def trace_id() -> str:
    """
    Obtain or create a per-request trace ID (X-Request-ID).
    Stores it on flask.g for access throughout the request lifetime.

    Returns:
        Unique trace ID string.
    """
    if getattr(g, "trace_id", None):
        return g.trace_id
    tid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    g.trace_id = tid
    return tid
