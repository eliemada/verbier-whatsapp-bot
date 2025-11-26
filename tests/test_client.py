"""Tests for the TeleportClient."""

from datetime import datetime, timezone

import httpx
import pytest
import respx

from teleport_client import (
    FeedNotFoundError,
    Frame,
    FrameQueryResult,
    ImageSize,
    TeleportClient,
    TeleportConnectionError,
)


@pytest.fixture
def mock_frames_response() -> dict:
    """Sample response from frame-query API."""
    return {
        "Frames": [
            "2025-11-24T21:12:00Z",
            "2025-11-25T21:12:00Z",
            "2025-11-26T21:12:00Z",
        ]
    }


@pytest.fixture
def sample_image_bytes() -> bytes:
    """Sample image data."""
    return b"\xff\xd8\xff\xe0\x00\x10JFIF"  # JPEG magic bytes


class TestTeleportClient:
    """Tests for TeleportClient."""

    @pytest.mark.asyncio
    async def test_context_manager(self) -> None:
        """Test that client works as context manager."""
        async with TeleportClient() as client:
            assert client._client is not None

    @pytest.mark.asyncio
    async def test_client_not_initialized_raises(self) -> None:
        """Test that using client without context manager raises."""
        client = TeleportClient()
        with pytest.raises(RuntimeError, match="Client not initialized"):
            _ = client.client

    @pytest.mark.asyncio
    @respx.mock
    async def test_get_current_image_success(
        self, sample_image_bytes: bytes
    ) -> None:
        """Test successful current image fetch."""
        respx.get(
            "https://www.teleport.io/api/v2/frame-get",
            params={"feedid": "test123", "sizecode": "x768"},
        ).respond(content=sample_image_bytes)

        async with TeleportClient() as client:
            result = await client.get_current_image("test123")

        assert result == sample_image_bytes

    @pytest.mark.asyncio
    @respx.mock
    async def test_get_current_image_small_size(
        self, sample_image_bytes: bytes
    ) -> None:
        """Test current image fetch with small size."""
        respx.get(
            "https://www.teleport.io/api/v2/frame-get",
            params={"feedid": "test123", "sizecode": "x480"},
        ).respond(content=sample_image_bytes)

        async with TeleportClient() as client:
            result = await client.get_current_image("test123", size=ImageSize.SMALL)

        assert result == sample_image_bytes

    @pytest.mark.asyncio
    @respx.mock
    async def test_get_current_image_not_found(self) -> None:
        """Test 404 raises FeedNotFoundError."""
        respx.get(
            "https://www.teleport.io/api/v2/frame-get",
            params={"feedid": "nonexistent", "sizecode": "x768"},
        ).respond(status_code=404)

        async with TeleportClient() as client:
            with pytest.raises(FeedNotFoundError) as exc_info:
                await client.get_current_image("nonexistent")

        assert exc_info.value.feed_id == "nonexistent"

    @pytest.mark.asyncio
    @respx.mock
    async def test_get_current_image_connection_error(self) -> None:
        """Test connection error is wrapped."""
        respx.get(
            "https://www.teleport.io/api/v2/frame-get",
            params={"feedid": "test123", "sizecode": "x768"},
        ).mock(side_effect=httpx.ConnectError("Connection failed"))

        async with TeleportClient() as client:
            with pytest.raises(TeleportConnectionError) as exc_info:
                await client.get_current_image("test123")

        assert "Connection failed" in str(exc_info.value)

    @pytest.mark.asyncio
    @respx.mock
    async def test_get_frame_history_success(
        self, mock_frames_response: dict
    ) -> None:
        """Test successful frame history query."""
        respx.get("https://www.teleport.io/api/v2/frame-query").respond(
            json=mock_frames_response
        )

        start = datetime(2025, 11, 24, 21, 12, 0, tzinfo=timezone.utc)
        end = datetime(2025, 11, 26, 21, 12, 0, tzinfo=timezone.utc)

        async with TeleportClient() as client:
            result = await client.get_frame_history(
                "test123", start, end, interval=86400
            )

        assert isinstance(result, FrameQueryResult)
        assert result.feed_id == "test123"
        assert len(result.frames) == 3
        assert all(isinstance(f, Frame) for f in result.frames)
        assert result.frames[0].timestamp == datetime(
            2025, 11, 24, 21, 12, 0, tzinfo=timezone.utc
        )
        assert result.frames[0].feed_id == "test123"

    @pytest.mark.asyncio
    @respx.mock
    async def test_get_frame_history_empty(self) -> None:
        """Test frame history with no frames."""
        respx.get("https://www.teleport.io/api/v2/frame-query").respond(
            json={"Frames": []}
        )

        start = datetime(2025, 11, 24, tzinfo=timezone.utc)
        end = datetime(2025, 11, 26, tzinfo=timezone.utc)

        async with TeleportClient() as client:
            result = await client.get_frame_history("test123", start, end)

        assert result.frames == []

    @pytest.mark.asyncio
    @respx.mock
    async def test_get_frame_image_success(
        self, sample_image_bytes: bytes
    ) -> None:
        """Test successful frame image fetch."""
        frame = Frame(
            timestamp=datetime(2025, 11, 25, 21, 12, 0, tzinfo=timezone.utc),
            feed_id="test123",
        )

        respx.get(
            "https://www.teleport.io/api/v2/frame-get",
            params={
                "feedid": "test123",
                "sizecode": "x768",
                "timestamp": "2025-11-25T21:12:00Z",
            },
        ).respond(content=sample_image_bytes)

        async with TeleportClient() as client:
            result = await client.get_frame_image(frame)

        assert result == sample_image_bytes

    @pytest.mark.asyncio
    async def test_custom_timeout(self) -> None:
        """Test client accepts custom timeout."""
        client = TeleportClient(timeout=60.0)
        assert client._timeout == 60.0

    @pytest.mark.asyncio
    async def test_default_size(self) -> None:
        """Test client accepts custom default size."""
        client = TeleportClient(default_size=ImageSize.SMALL)
        assert client._default_size == ImageSize.SMALL
