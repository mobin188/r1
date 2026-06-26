"""
Application factory and core initialization.
"""
from __future__ import annotations
import atexit
import logging
import sys
from logging.config import dictConfig
from typing import Optional

from flask import Flask, g, request

from config import get_config
from app.extensions import HTTPClient, http_client as global_http_client
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
        import app.extensions as _ext_local

        http_client = getattr(_ext_local, "http_client", None)
        if http_client is not None:
            sess = getattr(http_client, "session", None)
            if sess is not None:
                try:
                    sess.close()
                    logging.getLogger(__name__).debug("Closed http_client.session at process exit")
                except Exception:
                    logging.getLogger(__name__).exception(
                        "Failed to close http_client.session at process exit"
                    )
    except Exception:
        logging.getLogger(__name__).exception("Unhandled error during process cleanup")


def _register_process_cleanup() -> None:
    global _cleanup_registered
    if _cleanup_registered:
        return
    _cleanup_registered = True
    atexit.register(_process_cleanup)


def create_app(config=None) -> Flask:
    if config is None:
        config = get_config()

    app = Flask(__name__, static_folder="app/static", template_folder="app/templates")
    # Load config object (populates app.config mapping)
    app.config.from_object(config)

    # Logging config
    dictConfig(DEFAULT_LOG_CONFIG)
    app.logger.setLevel(app.config.get("LOG_LEVEL", "INFO"))

    # Initialize shared extensions
    # Configure HTTP client and attach to app.extensions
    max_retries = int(app.config.get("MAX_RETRIES", 2))
    httpc = HTTPClient(max_retries=max_retries)
    # Attach to module-level variable so other modules can import app.extensions.http_client
    import app.extensions as _ext

    _ext.http_client = httpc

    # register one-time process exit cleanup (keeps session open across requests)
    _register_process_cleanup()

    # Register blueprints
    app.register_blueprint(views_bp)
    app.register_blueprint(proxy_bp)
    app.register_blueprint(health_bp)

    # App start time for uptime reporting
    app._start_time = __import__("time").time()

    # Request wrapper adding trace header from flask.g.trace_id
    @app.before_request
    def attach_trace_id():
        # compute trace id and expose on g.trace_id (utils.trace_id provides same)
        g.trace_id = request.headers.get("X-Request-ID") or str(
            __import__("uuid").uuid4()
        )

    # NOTE: Do not close global/shared http_client.session in teardown_appcontext.
    # teardown_appcontext should be used only for request-scoped cleanup. Global
    # resources are closed once at process exit via the registered atexit handler.

    # TODO - Add error handlers here (JSON for /api, HTML for views) (if desired)

    return app
