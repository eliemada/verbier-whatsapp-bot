"""FastAPI server for teleport-client.

Run with: uv run uvicorn server:app --reload --port 3001
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response

from teleport_client import TeleportClient, ImageSize, FrameNotAvailableError

app = FastAPI(title="Teleport Image API", version="1.0.0")

# Configuration
FEED_ID = "fe5nsqhtejqi"
VERBIER_TZ = ZoneInfo("Europe/Zurich")


@app.get("/")
async def root():
    """Health check."""
    return {"status": "ok", "feed_id": FEED_ID}


@app.get("/image/current")
async def get_current_image(
    size: str = Query("large", enum=["large", "small"]),
):
    """Get the current live image.

    Returns JPEG image bytes.
    """
    img_size = ImageSize.LARGE if size == "large" else ImageSize.SMALL

    async with TeleportClient() as client:
        image = await client.get_current_image(FEED_ID, size=img_size)

    return Response(content=image, media_type="image/jpeg")


@app.get("/image/at")
async def get_image_at_time(
    hour: int = Query(..., ge=0, le=23, description="Hour (0-23) in local time"),
    minute: int = Query(0, ge=0, le=59),
    date: str | None = Query(None, description="Date in YYYY-MM-DD format (default: today)"),
    size: str = Query("large", enum=["large", "small"]),
):
    """Get image at a specific local time (Verbier timezone).

    - If date is not provided, uses today (or yesterday if time is in the future)
    - Returns JPEG image bytes
    """
    img_size = ImageSize.LARGE if size == "large" else ImageSize.SMALL

    # Parse date or use today
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = datetime.now(VERBIER_TZ).date()

    # Create datetime in local timezone
    target_local = datetime(
        target_date.year, target_date.month, target_date.day,
        hour, minute, 0,
        tzinfo=VERBIER_TZ,
    )

    # If no date provided and time is in future, use yesterday
    if date is None and target_local > datetime.now(VERBIER_TZ):
        target_local = target_local.replace(day=target_local.day - 1)

    # Convert to UTC
    target_utc = target_local.astimezone(ZoneInfo("UTC"))

    async with TeleportClient() as client:
        try:
            image = await client.get_image_at(FEED_ID, target_utc, size=img_size)
        except FrameNotAvailableError:
            raise HTTPException(404, f"No image available for {target_local}")

    return Response(content=image, media_type="image/jpeg")


@app.get("/image/8am")
async def get_8am_image(
    date: str | None = Query(None, description="Date in YYYY-MM-DD format"),
    size: str = Query("large", enum=["large", "small"]),
):
    """Shortcut: Get 8 AM image."""
    return await get_image_at_time(hour=8, minute=0, date=date, size=size)


@app.get("/image/noon")
async def get_noon_image(
    date: str | None = Query(None, description="Date in YYYY-MM-DD format"),
    size: str = Query("large", enum=["large", "small"]),
):
    """Shortcut: Get noon (12 PM) image."""
    return await get_image_at_time(hour=12, minute=0, date=date, size=size)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
