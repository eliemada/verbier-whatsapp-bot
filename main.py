"""Demo script to test the teleport client."""

import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path

from teleport_client import TeleportClient, ImageSize, VideoClip, Frame


FEED_ID = "fe5nsqhtejqi"
OUTPUT_DIR = Path("output")


async def demo_images() -> None:
    """Demo image fetching."""
    OUTPUT_DIR.mkdir(exist_ok=True)

    async with TeleportClient() as client:
        # 1. Fetch current live image
        print(f"Fetching current image for feed {FEED_ID}...")
        current_image = await client.get_current_image(FEED_ID)
        current_path = OUTPUT_DIR / "current.jpg"
        current_path.write_bytes(current_image)
        print(f"  Saved to {current_path} ({len(current_image):,} bytes)")

        # 2. Fetch current image in smaller size
        print("\nFetching current image (small size)...")
        small_image = await client.get_current_image(FEED_ID, size=ImageSize.SMALL)
        small_path = OUTPUT_DIR / "current_small.jpg"
        small_path.write_bytes(small_image)
        print(f"  Saved to {small_path} ({len(small_image):,} bytes)")

        # 3. Fetch historical frames at 3PM local (Verbier = CET = UTC+1)
        # 3PM CET = 14:00 UTC
        print("\n--- Historical frames at 3PM local (14:00 UTC) ---")

        today = datetime.now(timezone.utc).date()

        for days_ago in range(3, 0, -1):  # 3 days ago, 2 days ago, 1 day ago
            target_date = today - timedelta(days=days_ago)
            target_time = datetime(
                target_date.year,
                target_date.month,
                target_date.day,
                14, 0, 0,  # 14:00 UTC = 3PM CET (Verbier)
                tzinfo=timezone.utc,
            )

            frame = Frame(feed_id=FEED_ID, timestamp=target_time)

            print(f"\nFetching frame for {target_date} at 3PM local (14:00 UTC)...")
            try:
                frame_image = await client.get_frame_image(frame)
                frame_path = OUTPUT_DIR / f"daily_3pm_{target_date}.jpg"
                frame_path.write_bytes(frame_image)
                print(f"  Saved to {frame_path} ({len(frame_image):,} bytes)")
            except Exception as e:
                print(f"  Error: {e}")


async def demo_video() -> None:
    """Demo video fetching (slow - ~15 KB/s)."""
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Example video clip parameters (from teleport.io)
    clip = VideoClip(
        feed_id=FEED_ID,
        video_resource_id="7ftAjmwZOU",
        video_stream_id="PLRfvEwuw3",
        video_part_id="cAlqF0lOqe",
        timestamp=datetime(2025, 11, 26, 21, 34, 41, tzinfo=timezone.utc),
    )

    print(f"\nFetching video clip (this is slow, ~15 KB/s)...")
    print(f"  Resource: {clip.video_resource_id}")
    print(f"  Stream: {clip.video_stream_id}")
    print(f"  Part: {clip.video_part_id}")

    async with TeleportClient(video_timeout=600.0) as client:
        # Stream to file to show progress
        video_path = OUTPUT_DIR / "clip.mp4"

        async with await client.stream_video(clip) as response:
            total = 0
            with open(video_path, "wb") as f:
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    f.write(chunk)
                    total += len(chunk)
                    print(f"\r  Downloaded: {total:,} bytes", end="", flush=True)

        print(f"\n  Saved to {video_path}")


async def main() -> None:
    print("=== Teleport Client Demo ===\n")

    # Always run image demo
    await demo_images()

    # Ask about video demo (it's slow)
    print("\n" + "=" * 40)
    response = input("\nDownload video clip? (slow ~15 KB/s) [y/N]: ").strip().lower()
    if response == "y":
        await demo_video()

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
