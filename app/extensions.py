"""
Application extensions and shared runtime objects.

Keep initialization minimal here; concrete initialization happens in create_app()
Minimal initialization, deferred to create_app()
"""
from __future__ import annotations
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

# Shared extension instances (initialized in create_app)
http_client: requests.Session | None = None
circuit_breaker = None  # type: CircuitBreaker | None


def configure_session(max_retries: int = 2, backoff_factor: float = 0.3, pool_maxsize: int = 10) -> requests.Session:
    """
    Create and configure a requests.Session with retry logic and connection pooling.

    Args:
        max_retries: Number of retry attempts on 5xx errors.
        backoff_factor: Exponential backoff factor between retries.
        pool_maxsize: Maximum connections per host.

    Returns:
        Configured requests.Session ready for use.
    """
    session = requests.Session()
    retry = Retry(
        total=max_retries,
        backoff_factor=backoff_factor,
        status_forcelist=(500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_maxsize=pool_maxsize)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


class CircuitBreaker:
    """
    Simple in-memory circuit-breaker for upstream backends.
    Tracks consecutive failures and time of last failure.
    Supports a cooldown window after the failure threshold is reached.
    """

    def __init__(self, fail_threshold: int = 3, cooldown_sec: int = 10):
        self._states: dict[str, dict] = {}
        self.fail_threshold = fail_threshold
        self.cooldown_sec = cooldown_sec

    def record_failure(self, name: str) -> None:
        """Record a failure for the named backend."""
        import time
        if name not in self._states:
            self._states[name] = {"count": 0, "last_fail": 0.0}
        self._states[name]["count"] += 1
        self._states[name]["last_fail"] = time.time()

    def record_success(self, name: str) -> None:
        """Reset failure counter for the named backend."""
        if name not in self._states:
            self._states[name] = {"count": 0, "last_fail": 0.0}
        self._states[name]["count"] = 0
        self._states[name]["last_fail"] = 0.0

    def is_available(self, name: str) -> bool:
        """Check if the named backend is available (not in cooldown)."""
        import time
        if name not in self._states:
            self._states[name] = {"count": 0, "last_fail": 0.0}
        state = self._states[name]
        if state["count"] < self.fail_threshold:
            return True
        # Allow retries if cooldown window has expired
        return (time.time() - state["last_fail"]) > self.cooldown_sec
