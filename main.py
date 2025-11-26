"""Demo script to test the teleport client."""

import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path

from teleport_client import TeleportClient, ImageSize, VideoClip


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

        # 3. Query frame history (last 3 days)
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(days=3)
        print(f"\nQuerying frame history from {start_time.date()} to {end_time.date()}...")

        history = await client.get_frame_history(
            FEED_ID,
            start_time=start_time,
            end_time=end_time,
            interval=86400,  # daily
        )
        print(f"  Found {len(history.frames)} frames")

        # 4. Fetch first historical frame if available
        if history.frames:
            frame = history.frames[0]
            print(f"\nFetching historical frame from {frame.timestamp}...")
            frame_image = await client.get_frame_image(frame)
            frame_path = OUTPUT_DIR / f"frame_{frame.timestamp.strftime('%Y%m%d_%H%M%S')}.jpg"
            frame_path.write_bytes(frame_image)
            print(f"  Saved to {frame_path} ({len(frame_image):,} bytes)")


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
