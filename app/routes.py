import os
from flask import Blueprint, render_template, request, Response, redirect, current_app, jsonify
import requests
from dotenv import load_dotenv

import os
import uuid
import time
from urllib.parse import urljoin

import requests
from flask import Blueprint, current_app, jsonify, request, Response
from dotenv import load_dotenv

load_dotenv()

bp = Blueprint('main', __name__, static_folder="static", template_folder="templates")

@bp.route('/')
def index():
    return redirect("/login")


@bp.route('/login', methods=['GET'])
def login():
    return render_template("login.html")


@bp.route('/register', methods=['GET'])
def register():
    return render_template("register.html")


@bp.route('/articles', defaults={'page': 1})
@bp.route('/articles/page/<int:page>')
def dashboard(page):
    return render_template("dashboard.html")


@bp.route('/articles/create')
def create():
    return render_template("create.html")


@bp.route('/articles/edit/<slug>')
def edit(slug):
    return render_template("edit.html", slug=slug)


# -----------------------------------------------------------------------------
# CONFIG (backend-agnostic + future-proof)
# -----------------------------------------------------------------------------

PRIMARY_API = (os.getenv("API_BASE") or "").rstrip("/")
FALLBACK_API = (os.getenv("API_FALLBACK") or "").rstrip("/")

HOP_HEADERS = {
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

_session = requests.Session()


# -----------------------------------------------------------------------------
# HEALTH STATE (lightweight in-memory circuit behavior)
# -----------------------------------------------------------------------------

_backend_failures = {
    "primary": {"count": 0, "last_fail": 0},
    "fallback": {"count": 0, "last_fail": 0},
}

FAIL_THRESHOLD = 3
COOLDOWN_SEC = 10


# -----------------------------------------------------------------------------
# UTILITIES
# -----------------------------------------------------------------------------

def _base_alive(name: str) -> bool:
    state = _backend_failures[name]
    if state["count"] < FAIL_THRESHOLD:
        return True
    return (time.time() - state["last_fail"]) > COOLDOWN_SEC


def _record_failure(name: str):
    state = _backend_failures[name]
    state["count"] += 1
    state["last_fail"] = time.time()


def _record_success(name: str):
    _backend_failures[name]["count"] = 0


def _pick_backend():
    """
    Simple failover strategy:
    primary → fallback → primary
    """
    if PRIMARY_API and _base_alive("primary"):
        return "primary", PRIMARY_API

    if FALLBACK_API and _base_alive("fallback"):
        return "fallback", FALLBACK_API

    # fallback to primary anyway (last resort)
    return "primary", PRIMARY_API


def _build_url(base: str, path: str) -> str:
    return urljoin(base + "/", path.lstrip("/"))


def _clean_headers(headers):
    return {
        k: v
        for k, v in headers.items()
        if k.lower() not in HOP_HEADERS
    }


def _trace_id():
    return request.headers.get("X-Request-ID") or str(uuid.uuid4())


def _log(level, msg, **data):
    current_app.logger.info(
        f"[{level}] {msg} | " +
        " ".join(f"{k}={v}" for k, v in data.items())
    )


# -----------------------------------------------------------------------------
# RESPONSE WRAPPER
# -----------------------------------------------------------------------------

def _to_response(upstream: requests.Response) -> Response:
    resp = Response(upstream.content, status=upstream.status_code)

    for k, v in upstream.headers.items():
        if k.lower() not in HOP_HEADERS:
            resp.headers[k] = v

    return resp


# -----------------------------------------------------------------------------
# CORE PROXY
# -----------------------------------------------------------------------------

@bp.route("/api", defaults={"path": ""}, methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS","HEAD"])
@bp.route("/api/<path:path>", methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS","HEAD"])
def proxy(path):

    trace_id = _trace_id()
    backend_name, base = _pick_backend()
    url = _build_url(base, path)

    headers = _clean_headers(request.headers)
    headers["X-Request-ID"] = trace_id

    start = time.time()

    try:
        upstream = _session.request(
            method=request.method,
            url=url,
            params=request.args,
            data=request.get_data(cache=True),
            headers=headers,
            timeout=(3, 25),
            allow_redirects=False,
        )

        latency = round(time.time() - start, 4)

        if upstream.status_code >= 500:
            _record_failure(backend_name)
        else:
            _record_success(backend_name)

        _log(
            "INFO",
            "proxy_success",
            trace_id=trace_id,
            backend=backend_name,
            status=upstream.status_code,
            latency=latency,
            path=path,
        )

        return _to_response(upstream)

    except requests.Timeout:
        _record_failure(backend_name)

        _log(
            "WARN",
            "proxy_timeout",
            trace_id=trace_id,
            backend=backend_name,
            path=path,
        )

        return jsonify(error="Upstream timeout", trace_id=trace_id), 504

    except requests.RequestException:
        _record_failure(backend_name)

        _log(
            "ERROR",
            "proxy_failure",
            trace_id=trace_id,
            backend=backend_name,
            path=path,
        )

        return jsonify(error="Upstream unavailable", trace_id=trace_id), 502
