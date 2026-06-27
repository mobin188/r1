"""
Application extensions and shared runtime objects.

Keep initialization minimal here; concrete initialization happens in create_app()
so tests can override easily (e.g., app.extensions.http_client = MockClient()).
"""
from __future__ import annotations
import logging
from typing import Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

logger = logging.getLogger(__name__)

class HTTPClient:
    """
    Wrapper around requests.Session that configures an adapter with retry option.
    Intended for use as app.extensions.http_client.
    """

    def __init__(self, max_retries: int = 2, backoff_factor: float = 0.3, pool_maxsize: int = 10):
        self.session = requests.Session()
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.pool_maxsize = pool_maxsize
        self._configure_adapter()

    def _configure_adapter(self) -> None:
        retry = Retry(
            total=self.max_retries,
            backoff_factor=self.backoff_factor,
            status_forcelist=(500, 502, 503, 504),
            allowed_methods=frozenset(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry, pool_maxsize=self.pool_maxsize)
        # mount both http and https
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def request(self, method: str, url: str, **kwargs) -> requests.Response:
        """
        Thin wrapper — identical semantics to requests.Session.request.
        Callers may pass timeout=(connect, read) or timeout=int.
        """
        return self.session.request(method, url, **kwargs)

# Shared extension instances (initialized in create_app)
http_client: Optional[HTTPClient] = None
