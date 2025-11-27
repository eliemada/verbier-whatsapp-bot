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

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `!!`              | Current live image + weather     |
| `!snow weather`   | Weather only                     |
| `!snow 8am`       | Today's 8 AM image               |
| `!snow noon`      | Today's noon image               |
| `!snow 15:00`     | Today at specific time           |
| `!snow 11-20`     | Historical date at noon          |
| `!snow 11-20 8am` | Historical date at specific time |
| `!snow chatid`    | Get chat ID for config           |

## Setup

```bash
# Install dependencies
npm install

# Copy env template and add your chat IDs
cp .env.example .env

# Run the bot
npm start
```

On first run, scan the QR code with WhatsApp to authenticate.

### Getting Chat IDs

1. Start the bot and scan QR
2. Send `!snow chatid` in any chat/group
3. Add the returned ID to `.env`:

```env
WHATSAPP_CHAT_IDS=120363418246025671@g.us
```

Multiple groups (comma-separated):

```env
WHATSAPP_CHAT_IDS=123@g.us,456@g.us
```

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

## Docker (Unraid)

```bash
# First run - see QR code
docker compose up

# After scanning QR, run detached
docker compose up -d

# View logs
docker compose logs -f
```

Session data persists in `./data/` directory.

## Requirements

- Node.js >= 18 (or Docker)
- A WhatsApp account to run the bot
