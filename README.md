# Verbier WhatsApp Bot

WhatsApp bot that sends webcam images from Verbier with real-time weather data from MeteoSwiss.

## What it does

- Sends live webcam images from Verbier ski resort (via [Teleport.io](https://teleport.io))
- Includes weather from two MeteoSwiss stations:
    - **Les Attelas (2734m)** - mountain/piste conditions
    - **Montagnier (839m)** - valley conditions
- Scheduled daily updates at 8 AM and noon (Europe/Zurich)
- On-demand commands for current or historical images

## Commands

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `!!`                | Current live image + weather     |
| `!snow weather`     | Weather only                     |
| `!snow 8am`         | Today's 8 AM image               |
| `!snow noon`        | Today's noon image               |
| `!snow 15:00`       | Today at specific time           |
| `!snow 11-20`       | Historical date at noon          |
| `!snow 11-20 8am`   | Historical date at specific time |
| `!snow subscribe`   | Subscribe to daily updates       |
| `!snow unsubscribe` | Unsubscribe from updates         |
| `!snow chatid`      | Get chat ID (debug)              |

## Setup

```bash
# Install dependencies
npm install

# Run the bot
npm start
```

On first run, scan the QR code with WhatsApp to authenticate.

### Subscribe to Daily Updates

1. Start the bot and scan QR
2. In any chat/group, send `!snow subscribe`
3. That's it! The chat will receive daily updates at 8 AM and noon.

Use `!snow unsubscribe` to stop receiving updates.

## Development

```bash
npm run dev          # Run with auto-reload
npm run lint         # Check code
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format code
```

## Data Sources

- **Webcam**: [Teleport.io](https://teleport.io) - Verbier feed
- **Weather**: [MeteoSwiss Open Data](https://www.meteoswiss.admin.ch/services-and-publications/service/open-data.html) - 10-minute updates

## Docker

```bash
# First run - see QR/pairing code
docker compose up

# After auth, run detached
docker compose up -d

# View logs
docker compose logs -f
```

### Pairing Code Auth (recommended for Docker)

Instead of scanning a QR code, you can link with a phone number:

1. Set your phone number in `docker-compose.yml`:
    ```yaml
    environment:
        - PHONE_NUMBER=41791234567 # No + prefix
    ```
2. Run `docker compose up` and watch for: `Pairing code: ABCD-EFGH`
3. On phone: WhatsApp → Linked Devices → Link a Device → **Link with phone number** → Enter code

### Unraid

Use the Unraid-specific compose file:

```bash
docker compose -f docker-compose.unraid.yml up
```

Or manually in Unraid:

1. Add container from Docker Hub: `ghcr.io/eliemada/verbier-whatsapp-bot:latest`
2. Set paths:
    - `/app/data` → `/mnt/user/appdata/verbier-bot`
    - `/app/.wwebjs_auth` → `/mnt/user/appdata/verbier-bot`
3. Set environment:
    - `DATA_DIR=/app/data`
    - `PHONE_NUMBER=41791234567` (optional, for pairing code auth)
4. Set `--shm-size=1g` in extra parameters

Persistent data stored in appdata:

- WhatsApp session auth
- Chat subscriptions (`.chats.json`)

## Requirements

- Node.js >= 18 (or Docker)
- A WhatsApp account to run the bot
