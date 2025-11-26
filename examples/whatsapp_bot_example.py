"""Example: Using teleport-client with a WhatsApp bot.

This shows how to integrate with wwebjs or any WhatsApp library.
The key is that get_current_image() and get_image_at() return raw bytes
that can be sent directly as media.
"""

import asyncio
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from teleport_client import TeleportClient, ImageSize

# Feed configuration
FEED_ID = "fe5nsqhtejqi"

# Verbier timezone (CET/CEST)
VERBIER_TZ = ZoneInfo("Europe/Zurich")


async def get_current_snapshot() -> bytes:
    """Get the current live image from the feed."""
    async with TeleportClient() as client:
        return await client.get_current_image(FEED_ID)


async def get_scheduled_image(hour: int, minute: int = 0) -> bytes:
    """Get today's image at a specific local time (Verbier timezone).

    Args:
        hour: Hour in 24h format (e.g., 8 for 8 AM, 12 for noon)
        minute: Minute (default 0)

    Returns:
        JPEG image bytes
    """
    # Create datetime in local timezone
    now_local = datetime.now(VERBIER_TZ)
    target_local = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)

    # If the target time is in the future, use yesterday
    if target_local > now_local:
        target_local -= timedelta(days=1)

    # Convert to UTC for the API
    target_utc = target_local.astimezone(timezone.utc)

    async with TeleportClient() as client:
        return await client.get_image_at(FEED_ID, target_utc)


async def get_image_from_date(
    date: datetime,
    hour: int = 12,
    minute: int = 0,
) -> bytes:
    """Get image from a specific date and time.

    Args:
        date: The date (year, month, day)
        hour: Hour in 24h format (default noon)
        minute: Minute (default 0)

    Returns:
        JPEG image bytes
    """
    # Create datetime in Verbier timezone
    target_local = datetime(
        date.year, date.month, date.day,
        hour, minute, 0,
        tzinfo=VERBIER_TZ,
    )
    target_utc = target_local.astimezone(timezone.utc)

    async with TeleportClient() as client:
        return await client.get_image_at(FEED_ID, target_utc)


# =============================================================================
# WhatsApp Bot Integration Examples
# =============================================================================

async def send_8am_update():
    """Called by scheduler at 8 AM to send morning update."""
    image = await get_scheduled_image(hour=8)
    # With wwebjs (pseudo-code):
    # from whatsapp import MessageMedia
    # media = MessageMedia.fromBuffer(image, 'image/jpeg', 'verbier_8am.jpg')
    # await chat.send_media(media, caption="Good morning! Here's Verbier at 8 AM")
    return image


async def send_noon_update():
    """Called by scheduler at 12 PM to send noon update."""
    image = await get_scheduled_image(hour=12)
    # media = MessageMedia.fromBuffer(image, 'image/jpeg', 'verbier_noon.jpg')
    # await chat.send_media(media, caption="Noon update from Verbier!")
    return image


async def handle_history_command(date_str: str):
    """Handle user command like '!history 2025-11-20'.

    Args:
        date_str: Date in YYYY-MM-DD format
    """
    date = datetime.strptime(date_str, "%Y-%m-%d")
    image = await get_image_from_date(date, hour=12)
    # media = MessageMedia.fromBuffer(image, 'image/jpeg', f'verbier_{date_str}.jpg')
    # await chat.send_media(media, caption=f"Verbier on {date_str} at noon")
    return image


# =============================================================================
# Demo
# =============================================================================

async def demo():
    """Demo the functions."""
    print("1. Getting current snapshot...")
    current = await get_current_snapshot()
    print(f"   Got {len(current):,} bytes")

    print("\n2. Getting today's 8 AM image...")
    morning = await get_scheduled_image(hour=8)
    print(f"   Got {len(morning):,} bytes")

    print("\n3. Getting today's noon image...")
    noon = await get_scheduled_image(hour=12)
    print(f"   Got {len(noon):,} bytes")

    print("\n4. Getting image from Nov 20, 2025 at noon...")
    historical = await get_image_from_date(datetime(2025, 11, 20), hour=12)
    print(f"   Got {len(historical):,} bytes")

    print("\nAll functions work! Ready for WhatsApp integration.")


if __name__ == "__main__":
    asyncio.run(demo())
