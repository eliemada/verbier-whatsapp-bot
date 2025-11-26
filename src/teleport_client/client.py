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
from .models import Frame, FrameQueryResult, VideoClip


class ImageSize(str, Enum):
    """Available image size codes."""

    LARGE = "x768"
    SMALL = "x480"


class TeleportClient:
    """Async client for fetching images and videos from teleport.io feeds."""

    BASE_URL = "https://www.teleport.io"
    VIDEO_BASE_URL = "https://video.teleport.io"

    def __init__(
        self,
        timeout: float = 30.0,
        video_timeout: float = 300.0,
        default_size: ImageSize = ImageSize.LARGE,
    ) -> None:
        """Initialize the client.

        Args:
            timeout: HTTP request timeout in seconds for images.
            video_timeout: HTTP request timeout in seconds for videos (default 5 min).
            default_size: Default image size for fetches.
        """
        self._timeout = timeout
        self._video_timeout = video_timeout
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
        return await self.get_image_at(
            frame.feed_id, frame.timestamp, size=size
        )

    async def get_image_at(
        self,
        feed_id: str,
        dt: datetime,
        size: ImageSize | None = None,
    ) -> bytes:
        """Fetch image at a specific datetime.

        Convenience method for getting historical frames without
        creating a Frame object first.

        Args:
            feed_id: The teleport.io feed identifier.
            dt: The datetime to fetch (should be timezone-aware UTC).
            size: Image size (defaults to client's default_size).

        Returns:
            Raw image bytes (JPEG).

        Raises:
            FrameNotAvailableError: If no frame exists at that time.
            TeleportConnectionError: On network failures.

        Example:
            from datetime import datetime, timezone

            # Get frame from yesterday at 8 AM UTC
            yesterday_8am = datetime(2025, 11, 25, 8, 0, tzinfo=timezone.utc)
            image = await client.get_image_at("fe5nsqhtejqi", yesterday_8am)
        """
        size = size or self._default_size
        url = f"{self.BASE_URL}/api/v2/frame-get"
        timestamp = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        params = {
            "feedid": feed_id,
            "sizecode": size.value,
            "frametime": timestamp,
        }

        try:
            response = await self.client.get(url, params=params)
        except httpx.RequestError as e:
            raise TeleportConnectionError(
                f"Failed to connect to teleport.io: {e}", original_error=e
            ) from e

        if response.status_code == 404:
            raise FrameNotAvailableError(f"{feed_id} at {dt.isoformat()}")

        response.raise_for_status()
        return response.content

    async def get_video(self, clip: VideoClip) -> bytes:
        """Fetch a video clip.

        Note: Video downloads can be slow (~15 KB/s). Consider using
        stream_video() for large files.

        Args:
            clip: VideoClip metadata with resource/stream/part IDs.

        Returns:
            Raw video bytes (MP4).

        Raises:
            FrameNotAvailableError: If the video doesn't exist.
            TeleportConnectionError: On network failures.
        """
        url = f"{self.VIDEO_BASE_URL}/api/v2/video-get"
        timestamp = clip.timestamp.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        params = {
            "feedid": clip.feed_id,
            "videoresourceid": clip.video_resource_id,
            "videostreamid": clip.video_stream_id,
            "videopartid": clip.video_part_id,
            "rt": timestamp,
        }

        try:
            response = await self.client.get(
                url, params=params, timeout=self._video_timeout
            )
        except httpx.RequestError as e:
            raise TeleportConnectionError(
                f"Failed to connect to video.teleport.io: {e}", original_error=e
            ) from e

        if response.status_code == 404:
            raise FrameNotAvailableError(f"Video clip not found: {clip.video_part_id}")

        response.raise_for_status()
        return response.content

    async def stream_video(
        self,
        clip: VideoClip,
    ) -> httpx.Response:
        """Stream a video clip (for large files).

        Returns an httpx.Response that can be iterated for chunks.
        Caller is responsible for reading and closing the response.

        Args:
            clip: VideoClip metadata with resource/stream/part IDs.

        Returns:
            httpx.Response with streaming content.

        Example:
            async with client.stream_video(clip) as response:
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    file.write(chunk)
        """
        url = f"{self.VIDEO_BASE_URL}/api/v2/video-get"
        timestamp = clip.timestamp.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        params = {
            "feedid": clip.feed_id,
            "videoresourceid": clip.video_resource_id,
            "videostreamid": clip.video_stream_id,
            "videopartid": clip.video_part_id,
            "rt": timestamp,
        }

        return await self.client.stream("GET", url, params=params)
