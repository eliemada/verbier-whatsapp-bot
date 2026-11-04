# Quick Start

1. Install Docker with Compose 2.20 or newer.
2. Clone this repository and copy `.env.example` to `.env`.
3. Set distinct `WAHA_API_KEY` and `WEBHOOK_SECRET` values, generating each with `openssl rand -hex 32`.
4. Run `docker compose up --build -d`.
5. [Retrieve the pairing QR](deployment/docker.md#pair-whatsapp) and scan it in WhatsApp → Settings → Linked Devices.
6. Send `!snow subscribe` in your chosen WhatsApp group.
7. Send `!!` to request a current image and weather.

Subscriptions receive updates at **08:00 and 12:00 Europe/Zurich**. Data and WhatsApp authentication persist in separate directories. Keep both when redeploying.

Historical commands depend on the original Teleport archive, which may be unavailable. Live reports combine the four cameras; `!snow cameras` lists the individual-camera commands.
