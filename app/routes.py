import os
from flask import Blueprint, render_template, request, Response, redirect
import requests
from dotenv import load_dotenv

load_dotenv()

bp = Blueprint('main', __name__, static_folder="static", template_folder="templates")

# Real backend URL (from .env)
API_BASE = os.getenv("API_BASE", "https://api.mobinjafari.com/realworld/api")


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


# =============================================
# Transparent API Proxy to Separate Backend
# =============================================
@bp.route("/api/<path:endpoint>", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
def proxy(endpoint):
    """Proxy all /api/* calls to the external RealWorld backend.
    This avoids CORS issues and keeps the real URL out of frontend code.
    """
    target_url = f"{API_BASE.rstrip('/')}/{endpoint.lstrip('/')}"

    resp = requests.request(
        method=request.method,
        url=target_url,
        headers={k: v for k, v in request.headers if k.lower() not in ["host", "content-length"]},
        data=request.get_data(),
        cookies=request.cookies,
        allow_redirects=False,
        timeout=30,                    # Prevent hanging if backend is slow
    )

    # Remove hop-by-hop headers
    excluded_headers = {
        "content-encoding", "transfer-encoding", "connection",
        "keep-alive", "proxy-authenticate", "proxy-authorization",
        "te", "trailers", "upgrade"
    }

    headers = [(k, v) for k, v in resp.headers.items() if k.lower() not in excluded_headers]

    return Response(resp.content, resp.status_code, headers)
