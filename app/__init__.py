from flask import Flask, request
import time
import logging
import sys


def create_app(config=None):
    if config is None:
        from config import get_config
        config = get_config()

    app = Flask(__name__)
    app.config.from_object(config)  # Use class-based config instead of from_pyfile
    app.url_map.strict_slashes = False

    # Setup logging to stdout (journalctl)
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG if config.DEBUG else logging.INFO)
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    )
    handler.setFormatter(formatter)

    if not app.logger.handlers:
        app.logger.addHandler(handler)
        app.logger.setLevel(logging.DEBUG if config.DEBUG else logging.INFO)

    # Log each incoming request
    @app.before_request
    def log_request():
        app.logger.info("%s - %s %s", request.remote_addr, request.method, request.path)

    # Record start time for uptime calculation
    app._start_time = time.time()

    from .routes import bp
    app.register_blueprint(bp)

    return app
