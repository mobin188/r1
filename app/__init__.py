"""
Application factory and core initialization.
"""
from __future__ import annotations
import atexit
import logging
import os
import sys
from logging.config import dictConfig

from flask import Flask, g, request

from config import get_config
from app import extensions
from app.views import bp as views_bp
from app.proxy import bp as proxy_bp
from app.health import bp as health_bp

DEFAULT_LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "[%(asctime)s] %(levelname)s %(name)s: %(message)s"
        }
    },
    "handlers": {
        "stdout": {
            "class": "logging.StreamHandler",
            "stream": sys.stdout,
            "formatter": "default",
        }
    },
    "root": {
        "level": "INFO",
        "handlers": ["stdout"]
    }
}


# Process-level cleanup registration to close shared extensions once at process exit.
_cleanup_registered = False


def _process_cleanup() -> None:
    """Close long-lived shared resources at process exit (best-effort)."""
    try:
        if extensions.http_client is not None:
            try:
                extensions.http_client.close()
                logging.getLogger(__name__).debug("Closed http_client session at process exit")
            except Exception:
                logging.getLogger(__name__).exception("Failed to close http_client session at process exit")
    except Exception:
        logging.getLogger(__name__).exception("Unhandled error during process cleanup")


def _register_process_cleanup() -> None:
    """Register process-exit cleanup via atexit (runs once per process)."""
    global _cleanup_registered
    if _cleanup_registered:
        return
    _cleanup_registered = True
    atexit.register(_process_cleanup)


def create_app(config=None) -> Flask:
    if config is None:
        config = get_config()

    pkg_dir = os.path.dirname(__file__)
    app = Flask(
        __name__,
        static_folder=os.path.join(pkg_dir, "static"),
        template_folder=os.path.join(pkg_dir, "templates"),
    )
    app.config.from_object(config)

    # Logging
    dictConfig(DEFAULT_LOG_CONFIG)
    app.logger.setLevel(app.config.get("LOG_LEVEL", "INFO"))

    # Initialize shared extensions
    max_retries = int(app.config.get("MAX_RETRIES", 2))
    extensions.http_client = extensions.configure_session(max_retries=max_retries)

    fail_threshold = int(app.config.get("FAIL_THRESHOLD", 3))
    cooldown_sec = int(app.config.get("COOLDOWN_SEC", 10))
    extensions.circuit_breaker = extensions.CircuitBreaker(fail_threshold=fail_threshold, cooldown_sec=cooldown_sec)

    # Register process-exit cleanup
    _register_process_cleanup()

    # Register blueprints
    app.register_blueprint(views_bp)
    app.register_blueprint(proxy_bp)
    app.register_blueprint(health_bp)

    # App start time for uptime reporting
    app._start_time = __import__("time").time()

    # Request wrapper: attach trace ID
    @app.before_request
    def attach_trace_id():
        g.trace_id = request.headers.get("X-Request-ID") or str(__import__("uuid").uuid4())

    return app
