# Teleport Client Design

**Date:** 2025-11-26
**Status:** Approved

## Overview

A Python async library for fetching images from teleport.io feeds. Designed as a backend component for a WhatsApp bot that sends feed images to groups.

## Requirements

- Fetch current/live images from teleport.io feeds
- Query historical frames with time range filtering
- Async-first design for bot integration
- No authentication (public feeds only)
- Return raw bytes for images, structured data for metadata

## Project Structure

```
teleport-client/
├── pyproject.toml
├── src/
│   └── teleport_client/
│       ├── __init__.py
│       ├── client.py
│       ├── models.py
│       └── exceptions.py
└── tests/
    └── test_client.py
```

## Models

```python
from pydantic import BaseModel
from datetime import datetime

class Feed(BaseModel):
    """Configuration for a teleport.io feed."""
    feed_id: str
    base_url: str = "https://www.teleport.io"

class Frame(BaseModel):
    """Metadata for a single frame in history."""
    timestamp: datetime
    url: str

class FrameQueryResult(BaseModel):
    """Result from a history query."""
    feed_id: str
    start_time: datetime
    end_time: datetime
    interval_seconds: int
    frames: list[Frame]
```

## Client Interface

```python
class TeleportClient:
    """Async client for teleport.io feeds."""

    def __init__(self, timeout: float = 30.0):
        """Initialize with optional timeout config."""

    async def get_current_image(self, feed_id: str) -> bytes:
        """Fetch the current/live image for a feed."""

    async def get_frame_history(
        self,
        feed_id: str,
        start_time: datetime,
        end_time: datetime,
        interval: int = 86400,
    ) -> FrameQueryResult:
        """Query available frames in a time range."""

    async def get_frame_image(self, frame: Frame) -> bytes:
        """Fetch a specific frame's image."""

    async def __aenter__(self) -> "TeleportClient": ...
    async def __aexit__(self, ...): ...
```

### Usage Example

```python
async with TeleportClient() as client:
    # Get live image
    image = await client.get_current_image("fe5nsqhtejqi")

    # Browse history
    history = await client.get_frame_history("fe5nsqhtejqi", start, end)
    frame_image = await client.get_frame_image(history.frames[0])
```

## Error Handling

```python
class TeleportError(Exception):
    """Base exception for all teleport client errors."""

class FeedNotFoundError(TeleportError):
    """Raised when a feed_id doesn't exist."""

class FrameNotAvailableError(TeleportError):
    """Raised when a requested frame doesn't exist."""

class TeleportConnectionError(TeleportError):
    """Raised on network/connection failures."""
```

## API Endpoints

| Method | Endpoint |
|--------|----------|
| Current image | `GET /view?feedId={feed_id}&view=full` |
| Frame history | `GET /api/v2/frame-query?feedid={feed_id}&starttime={iso}&endtime={iso}&mode=pf&interval={seconds}` |

## Dependencies

```toml
[project]
name = "teleport-client"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "httpx>=0.27",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = ["pytest", "pytest-asyncio", "respx"]
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Async vs Sync | Async | Better for bot backends, non-blocking |
| Image return | Raw bytes | Flexible for WhatsApp integration |
| History return | Metadata first | Memory efficient, fetch on demand |
| Auth | None | Public feeds only |
| Python version | 3.11+ | Modern typing syntax |
