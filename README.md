# Verbier WhatsApp Bot

WhatsApp bot that sends webcam images from Verbier with real-time weather data from MeteoSwiss.

## What it does

- Sends live webcam images from Verbier ski resort (via [Teleport.io](https://teleport.io))
- Falls back to the live [Le Carrefour panorama](https://lecarrefour.roundshot.com/) when the original Teleport feed is unavailable. Historical commands use Teleport only; unavailable archives are reported explicitly.
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

The container is healthy only when WhatsApp is connected. If it needs pairing, scan the QR in the logs under WhatsApp → Settings → Linked Devices. Keep the session volume when redeploying. Startup removes stale Chromium lock symlinks left by stopped containers without deleting session data.

An operator API listens on `127.0.0.1:3000` **inside the container** (no published port). Use `docker exec` to access it:

```bash
docker exec verbier-whatsapp-bot node -e "fetch('http://127.0.0.1:3000/health').then(async r => { console.log(await r.json()); process.exit(r.ok ? 0 : 1); })"
```

`GET /chat?id=CHAT_ID` verifies a recipient. `POST /send` with a JSON body such as `{"chatId":"YOUR_GROUP_ID@g.us","title":"Verbier bot test"}` sends one current image and weather update to that specific chat. It does not change subscriptions. The result includes the WhatsApp message ID and acknowledgement; `GET /delivery?id=MESSAGE_ID` checks acknowledgement again (1 = accepted by WhatsApp, 2 = delivered, 3 = read). Do not repeat a send just because acknowledgement is still pending. `GET /qr` returns the current pairing QR payload when linking is needed; treat it as a credential.

### NAS Deployment (with Auto-Updates)

The NAS compose files include [Watchtower](https://containrrr.dev/watchtower/) for automatic updates. When a new image is pushed to GitHub, Watchtower pulls it and restarts the container.

**Unraid:**

```bash
docker compose -f docker-compose.unraid.yml up -d
```

**Other NAS (Synology, QNAP, TrueNAS):**

```bash
# Edit docker-compose.nas.yml to set your volume path first
docker compose -f docker-compose.nas.yml up -d
```

### Auto-Updates

Watchtower is included in the NAS compose files:

- Checks for new images every 5 minutes
- Only updates containers with the watchtower label
- Cleans up old images automatically

To disable auto-updates, remove the `watchtower` service from the compose file.

### Persistent Data

Stored in appdata:

- WhatsApp session auth
- Chat subscriptions (`.chats.json`)

## Requirements

- Node.js 22 or 24 for development (or Docker, which uses Node.js 24)
- A WhatsApp account to run the bot
