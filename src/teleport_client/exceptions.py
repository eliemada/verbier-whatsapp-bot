"""Custom exceptions for the teleport client."""


class TeleportError(Exception):
    """Base exception for all teleport client errors."""


class FeedNotFoundError(TeleportError):
    """Raised when a feed_id doesn't exist."""

    def __init__(self, feed_id: str) -> None:
        self.feed_id = feed_id
        super().__init__(f"Feed not found: {feed_id}")


class FrameNotAvailableError(TeleportError):
    """Raised when a requested frame doesn't exist."""

    def __init__(self, url: str) -> None:
        self.url = url
        super().__init__(f"Frame not available: {url}")


class TeleportConnectionError(TeleportError):
    """Raised on network/connection failures."""

    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.original_error = original_error
        super().__init__(message)
