"""
Small, cross-app utility helpers
"""
from __future__ import annotations
import uuid
from typing import Dict

from flask import request, g

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
    Return a copy of headers but only with allowed keys.
    """
    return {k: v for k, v in headers.items() if k.lower() in ALLOWED_REQUEST_HEADERS}

def trace_id() -> str:
    """
    Obtain or create a per-request trace id (X-Request-ID). Stored on flask.g.
    """
    if getattr(g, "trace_id", None):
        return g.trace_id
    tid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    g.trace_id = tid
    return tid
