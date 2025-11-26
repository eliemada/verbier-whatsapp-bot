"""Pydantic models for teleport.io API responses."""

from datetime import datetime

from pydantic import BaseModel, Field


class Feed(BaseModel):
    """Configuration for a teleport.io feed."""

    feed_id: str
    base_url: str = "https://www.teleport.io"


class Frame(BaseModel):
    """Metadata for a single frame in history."""

    timestamp: datetime
    feed_id: str


class FrameQueryResult(BaseModel):
    """Result from a history query."""

    feed_id: str
    start_time: datetime
    end_time: datetime
    interval_seconds: int = Field(alias="interval")
    frames: list[Frame]
