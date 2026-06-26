"""
Development runner: env-driven defaults, CLI overrides, graceful shutdown.

- Loads .env only for development or when a .env file is present.
- Supports host/port/threaded/reloader/log-level overrides via CLI or ENV.
- Optional --certfile/--keyfile for local TLS testing.
- Installs SIGINT/SIGTERM handlers in the actual server process to close shared resources.
- Also registers a teardown handler so WSGI servers will close resources when the app context ends.
"""
from __future__ import annotations

import argparse
import logging
import os
import signal
import sys
from typing import Optional, Tuple, cast, Callable
from types import FrameType

from dotenv import load_dotenv


# Load .env (only in development or explicit .env file present).
def _load_dotenv() -> None:
    env = os.getenv("FLASK_ENV", "").lower()
    if env == "development" or os.path.exists(".env"):
        load_dotenv()


_load_dotenv()

# Defer application imports until after dotenv decision
from config import get_config  # noqa: E402
from app import create_app  # noqa: E402
import app.extensions as extensions  # noqa: E402

LOGGER = logging.getLogger(__name__)


def _close_extensions() -> None:
    """Best-effort cleanup of shared resources registered on app.extensions."""
    http_client = getattr(extensions, "http_client", None)
    if http_client is not None:
        sess = getattr(http_client, "session", None)
        if sess is not None:
            try:
                sess.close()
                LOGGER.debug("Closed http_client.session")
            except Exception:
                LOGGER.exception("Failed to close http_client.session cleanly")


def _install_signal_handlers(app) -> None:
    """
    Install SIGINT/SIGTERM handlers to perform graceful shutdown.
    """

    # Make sure the current process is the actual running server (child)
    is_server_process = os.getenv("WERKZEUG_RUN_MAIN") == "true" or os.getenv("WERKZEUG_RUN_MAIN") == "1" or os.getenv(
        "FLASK_RUN_FROM_CLI") == "true"
    if not is_server_process:
        # Avoid installing handlers on parent reloading process as it handles restart itself. (Avoid duplication)
        LOGGER.debug("Signal handlers installation aborted: non-server process")
        return

    # close http_session and other resources
    def _handle(signum, frame) -> None:
        app.logger.info("Received signal %s, shutting down...", signum)
        _close_extensions()
        sys.exit(0)

    signal.signal(signal.SIGTERM, _handle)
    try:
        signal.signal(signal.SIGTERM, _handle)
    except AttributeError:
        # Windows may not have SIGTERM; ignore
        LOGGER.debug("SIGTERM not supported on this platform")


def _build_arg_parser(default_host: str = "127.0.0.1", default_port: int = 5000) -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Run the Flask app in development mode.")
    p.add_argument("--host", default=os.getenv("HOST", default_host), help="Host to bind to (env: HOST)")
    p.add_argument("--port", type=int, default=int(os.getenv("PORT", default_port)), help="Port to bind to (env: PORT)")
    p.add_argument("--no-reload", dest="use_reloader", action="store_false", help="Disable the auto-reloader")
    p.add_argument("--log-level", default=os.getenv("LOG_LEVEL", None), help="Override log level")
    p.add_argument("--no-threads", dest="threaded", action="store_false",
                   help="Run without threaded mode (single-threaded)")
    p.add_argument("--certfile", default=os.getenv("DEV_CERTFILE", None), help="TLS cert file for local HTTPS")
    p.add_argument("--keyfile", default=os.getenv("DEV_KEYFILE", None), help="TLS key file for local HTTPS")
    return p


def _setup_logging(app, override_level: Optional[str]) -> None:
    # Default logging setup, unless already configured via dictConfig.
    if override_level:
        level = override_level.upper()
    else:
        level = app.config.get("LOG_LEVEL", "INFO")
    logging.basicConfig(level=getattr(logging, level, logging.INFO),
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    app.logger.setLevel(getattr(logging, level, logging.INFO))


def main(argv: Optional[list[str]] = None) -> None:
    parser = _build_arg_parser()
    args = parser.parse_args(argv)

    config = get_config()
    app = create_app(config)

    # register teardown to ensure resources are closed when app context ends (WSGI)
    @app.teardown_appcontext
    def _teardown(exception=None):
        _close_extensions()

    # logging
    _setup_logging(app, args.log_level)

    # install signal handlers in the actual server process only
    _install_signal_handlers(app)

    host = args.host
    port = args.port
    use_reloader = getattr(config, "DEBUG", False) and args.use_reloader
    threaded = getattr(config, "DEBUG", True) and args.threaded  # default threaded True in dev

    ssl_context: Optional[Tuple[str, str]] = None
    if args.certfile and args.keyfile:
        ssl_context = (args.certfile, args.keyfile)
        app.logger.info("Running with TLS using certfile=%s keyfile=%s", args.certfile, args.keyfile)

    app.logger.info("Starting development server on %s:%s (debug=%s, reloader=%s, threaded=%s)", host, port,
                    config.DEBUG, use_reloader, threaded)

    # Run the Flask development server for local development only.
    # For production, use a WSGI server (gunicorn/uWSGI) and import `app` from wsgi.py.
    app.run(host=host, port=port, debug=config.DEBUG, use_reloader=use_reloader, threaded=threaded,
            ssl_context=ssl_context)


if __name__ == "__main__":
    main()
