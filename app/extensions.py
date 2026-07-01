"""
Application extensions and shared runtime objects.

Keep initialization minimal here; full initialization happens in create_app()
"""
from __future__ import annotations
import time

import httpx

# Shared extension instances (initialized in create_app)
http_client: httpx.Client | None = None
circuit_breaker = None  # type: CircuitBreaker | None


def configure_session(max_retries: int = 2, backoff_factor: float = 0.3, pool_maxsize: int = 10) -> httpx.Client:
    """
    Create and configure an httpx.Client with retry logic and connection pooling.

    Args:
        max_retries: Number of retry attempts on 5xx errors.
        backoff_factor: Exponential backoff factor between retries (unused by httpx natively,
                        kept for API compatibility — use a retry transport if needed).
        pool_maxsize: Maximum connections per host.

    Returns:
        Configured httpx.Client ready for use.
    """
    transport = httpx.HTTPTransport(
        retries=max_retries,
        limits=httpx.Limits(
            max_connections=pool_maxsize * 2,
            max_keepalive_connections=pool_maxsize,
            keepalive_expiry=30,
        ),
    )
    return httpx.Client(transport=transport, follow_redirects=False)


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
        if name not in self._states:
            self._states[name] = {"count": 0, "last_fail": 0.0}
        state = self._states[name]
        if state["count"] < self.fail_threshold:
            return True
        return (time.time() - state["last_fail"]) > self.cooldown_sec
