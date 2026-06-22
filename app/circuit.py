"""
Simple in-memory circuit-breaker for upstream backends.

It tracks consecutive failures and time of last failure,
and supports a cooldown window after the failure threshold is reached.
"""
from __future__ import annotations
import time
from dataclasses import dataclass

@dataclass
class CircuitState:
    count: int = 0
    last_fail: float = 0.0

class CircuitBreaker:
    def __init__(self, fail_threshold: int = 3, cooldown_sec: int = 10):
        self._states: dict[str, CircuitState] = {}
        self.fail_threshold = fail_threshold
        self.cooldown_sec = cooldown_sec

    def record_failure(self, name: str) -> None:
        s = self._states.setdefault(name, CircuitState())
        s.count += 1
        s.last_fail = time.time()

    def record_success(self, name: str) -> None:
        s = self._states.setdefault(name, CircuitState())
        s.count = 0
        s.last_fail = 0.0

    def is_available(self, name: str) -> bool:
        s = self._states.setdefault(name, CircuitState())
        if s.count < self.fail_threshold:
            return True
        # allow retries if cooldown window has expired
        return (time.time() - s.last_fail) > self.cooldown_sec
