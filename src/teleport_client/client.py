"""Async client for teleport.io feeds."""

from datetime import datetime
from enum import Enum
from typing import Self

import httpx

from .exceptions import (
    FeedNotFoundError,
    FrameNotAvailableError,
    TeleportConnectionError,
)
from .models import Frame, FrameQueryResult


class ImageSize(str, Enum):
    """Available image size codes."""

    LARGE = "x768"
    SMALL = "x480"


class TeleportClient:
    """Async client for fetching images from teleport.io feeds."""

    BASE_URL = "https://www.teleport.io"

    def __init__(
        self,
        timeout: float = 30.0,
        default_size: ImageSize = ImageSize.LARGE,
    ) -> None:
        """Initialize the client.

        Args:
            timeout: HTTP request timeout in seconds.
            default_size: Default image size for fetches.
        """
        self._timeout = timeout
        self._default_size = default_size
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> Self:
        """Enter async context manager."""
        self._client = httpx.AsyncClient(timeout=self._timeout)
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: object,
    ) -> None:
        """Exit async context manager."""
        if self._client:
            await self._client.aclose()
            self._client = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Get the HTTP client, ensuring it's initialized."""
        if self._client is None:
            raise RuntimeError(
                "Client not initialized. Use 'async with TeleportClient() as client:'"
            )
        return self._client

    async def get_current_image(
        self,
        feed_id: str,
        size: ImageSize | None = None,
    ) -> bytes:
        """Fetch the current/live image for a feed.

        Args:
            feed_id: The teleport.io feed identifier.
            size: Image size (defaults to client's default_size).

        Returns:
            Raw image bytes (JPEG).

        Raises:
            FeedNotFoundError: If the feed doesn't exist.
            TeleportConnectionError: On network failures.
        """
        size = size or self._default_size
        url = f"{self.BASE_URL}/api/v2/frame-get"
        params = {"feedid": feed_id, "sizecode": size.value}

        try:
            response = await self.client.get(url, params=params)
        except httpx.RequestError as e:
            raise TeleportConnectionError(
                f"Failed to connect to teleport.io: {e}", original_error=e
            ) from e

        if response.status_code == 404:
            raise FeedNotFoundError(feed_id)

        response.raise_for_status()
        return response.content

    async def get_frame_history(
        self,
        feed_id: str,
        start_time: datetime,
        end_time: datetime,
        interval: int = 86400,
    ) -> FrameQueryResult:
        """Query available frames in a time range.

        Args:
            feed_id: The teleport.io feed identifier.
            start_time: Start of the time range (UTC).
            end_time: End of the time range (UTC).
            interval: Interval between frames in seconds (default: 86400 = daily).

        Returns:
            FrameQueryResult with metadata about available frames.

        Raises:
            FeedNotFoundError: If the feed doesn't exist.
            TeleportConnectionError: On network failures.
        """
        url = f"{self.BASE_URL}/api/v2/frame-query"
        params = {
            "feedid": feed_id,
            "starttime": start_time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "endtime": end_time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "mode": "pf",
            "interval": str(interval),
        }

        try:
            response = await self.client.get(url, params=params)
        except httpx.RequestError as e:
            raise TeleportConnectionError(
                f"Failed to connect to teleport.io: {e}", original_error=e
            ) from e

        if response.status_code == 404:
            raise FeedNotFoundError(feed_id)

        response.raise_for_status()
        data = response.json()

        # Parse the Frames array (list of ISO timestamps)
        frames = [
            Frame(
                timestamp=datetime.fromisoformat(ts.replace("Z", "+00:00")),
                feed_id=feed_id,
            )
            for ts in data.get("Frames", [])
        ]

        return FrameQueryResult(
            feed_id=feed_id,
            start_time=start_time,
            end_time=end_time,
            interval=interval,
            frames=frames,
        )

    async def get_frame_image(
        self,
        frame: Frame,
        size: ImageSize | None = None,
    ) -> bytes:
        """Fetch a specific frame's image.

        Args:
            frame: Frame metadata (from get_frame_history).
            size: Image size (defaults to client's default_size).

        Returns:
            Raw image bytes (JPEG).

        Raises:
            FrameNotAvailableError: If the frame doesn't exist.
            TeleportConnectionError: On network failures.
        """
        size = size or self._default_size
        url = f"{self.BASE_URL}/api/v2/frame-get"
        timestamp = frame.timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        params = {
            "feedid": frame.feed_id,
            "sizecode": size.value,
            "timestamp": timestamp,
        }

        try:
            response = await self.client.get(url, params=params)
        except httpx.RequestError as e:
            raise TeleportConnectionError(
                f"Failed to connect to teleport.io: {e}", original_error=e
            ) from e

        if response.status_code == 404:
            raise FrameNotAvailableError(
                f"{frame.feed_id} at {frame.timestamp.isoformat()}"
            )

        response.raise_for_status()
        return response.content
