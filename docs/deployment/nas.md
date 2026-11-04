# NAS Deployment and Migration

Use Docker Compose 2.20+ and keep `compose.waha.yml` beside the selected compose file.

## Unraid

Copy `.env.example` to `.env`, set the two random secrets, and configure:

```dotenv
BOT_DATA_DIR=/mnt/user/appdata/verbier-bot
WAHA_DATA_DIR=/mnt/user/appdata/verbier-waha
WAHA_PORT=3010
# Set BOT_IMAGE_TAG to a tested seven-character commit tag.
```

```bash
docker compose -f docker-compose.unraid.yml up -d
```

If using Unraid Compose Manager, the contents of `docker-compose.unraid.yml` can serve as the project's `docker-compose.yml`. Copy `compose.waha.yml` and `.env` into that project directory too.

Follow [pairing and verification](docker.md). Bot and WAHA containers opt out of Watchtower. An existing shared Watchtower service may remain running for other applications.

## Synology, QNAP, TrueNAS and other hosts

Set absolute data paths suitable for the host, then run:

```bash
docker compose -f docker-compose.nas.yml up -d
```

## Migrating from whatsapp-web.js

1. Stop the old bot to prevent duplicate scheduled sends.
2. Back up the old compose files, image tag and appdata directory, including `.chats.json` and browser authentication files.
3. Keep `BOT_DATA_DIR` pointing to the directory containing `.chats.json`. Use a separate, new `WAHA_DATA_DIR`.
4. Install the new compose files, generate the two secrets and pin the new bot image.
5. Start the stack and scan WAHA's new QR. Browser credentials cannot be imported into GOWS.
6. Verify the target group, send one live update and check the result in WhatsApp.
7. Restart the services and verify `WORKING` without scanning again.

The bot retains subscriptions; migration does not subscribe additional chats. Leave the old browser files in the backup until the replacement has been verified. Restoring the old deployment may still require relinking its WhatsApp device.
