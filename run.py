"""
Development runner: env-driven defaults, CLI overrides, graceful shutdown with draining.

- Loads .env only for development or when a .env file is present.
- Supports host/port/threaded/reloader/log-level overrides via CLI or ENV.
- Installs SIGINT/SIGTERM handlers in the actual server process to run a drain step,
  wait for in-flight requests (configurable via SHUTDOWN_TIMEOUT), then close resources.
- Also registers a teardown handler so WSGI servers will close resources when the app context ends.
"""
from __future__ import annotations

import argparse
import atexit
import logging
import os
import signal
import sys
from typing import Optional, Tuple
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
    Install SIGINT/SIGTERM handlers to perform graceful shutdown with draining.
    Only install in the actual server process (avoid installing in the reloader parent).
    """
    # With the Werkzeug reloader, the *child* server process sets WERKZEUG_RUN_MAIN=1.
    is_server_process = os.getenv("WERKZEUG_RUN_MAIN") in ("true", "1") or os.getenv("FLASK_RUN_FROM_CLI") == "true"
    if not is_server_process:
        LOGGER.debug("Not installing signal handlers in non-server process")
        return

    def _handle(signum: int, frame: Optional[FrameType]) -> None:
        app.logger.info("Received signal %s, initiating graceful shutdown (drain)...", signum)
        try:
            shutdown_timeout = int(os.getenv("SHUTDOWN_TIMEOUT", "30"))
            start_draining = getattr(app, "start_draining", None)
            if callable(start_draining):
                try:
                    drained = start_draining(shutdown_timeout)
                    if not drained:
                        app.logger.warning("Drain did not finish before timeout; forcing shutdown")
                except Exception:
                    app.logger.exception("Exception while draining; proceeding to shutdown")
            else:
                app.logger.debug("No drain support on app; skipping drain step")

            _close_extensions()
        except Exception:
            app.logger.exception("Unhandled error during shutdown sequence")
        finally:
            # Exit the process - acceptable for dev runner
            sys.exit(0)

    # Install handlers for both SIGINT (Ctrl-C) and SIGTERM
    signal.signal(signal.SIGINT, _handle)
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

    # Register atexit fallback to close shared extensions on normal process exit
    atexit.register(_close_extensions)

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
