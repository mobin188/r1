import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable is required for security")

    # Environment
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    DEBUG = FLASK_ENV == "development"

    # RealWorld API
    API_BASE = os.getenv("API_BASE")
    FALLBACK_API = os.getenv("FALLBACK_API")

    # Proxy behavior
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "10"))
    MAX_RETRIES = int(os.getenv("MAX_RETRIES", "2"))

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    # Security headers
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "True").lower() in ("true", "1", "yes")
    SESSION_COOKIE_HTTPONLY = os.getenv("SESSION_COOKIE_HTTPONLY", "True").lower() in ("true", "1", "yes")
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")


class DevelopmentConfig(Config):
    """Development overrides."""
    DEBUG = True
    LOG_LEVEL = "DEBUG"

    # Relax security for local HTTP development
    SESSION_COOKIE_SECURE = False


class ProductionConfig(Config):
    """Production overrides."""
    DEBUG = False
    LOG_LEVEL = "INFO"


def get_config():
    """Return the appropriate config class."""
    env = os.getenv("FLASK_ENV", "production").lower()
    if env == "development":
        return DevelopmentConfig()
    return ProductionConfig()
