# Quick Start

Get the Verbier bot running in under 5 minutes.

## Prerequisites

- Node.js 18+ **or** Docker
- A WhatsApp account (will be used by the bot)

## Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/eliemada/verbier-whatsapp-bot.git
cd verbier-whatsapp-bot

# Start the bot (first run - watch for QR code)
docker compose up

# Scan the QR code with WhatsApp
# After authenticated, restart detached:
docker compose up -d
```

## Option 2: Node.js

```bash
# Clone and install
git clone https://github.com/eliemada/verbier-whatsapp-bot.git
cd verbier-whatsapp-bot
npm install

# Start the bot
npm start
```

## First Run

1. The bot will display a QR code in the terminal
2. Open WhatsApp on your phone
3. Go to **Settings** → **Linked Devices** → **Link a Device**
4. Scan the QR code
5. The bot is now connected!

## Subscribe to Updates

In any WhatsApp chat or group:

```
!snow subscribe
```

That chat will now receive daily updates at 8 AM and noon (Europe/Zurich timezone).

## Test It

Send `!!` in any chat to get the current webcam image with weather.

## Next Steps

- [All Commands](commands.md) - Full command reference
- [NAS Deployment](deployment/nas.md) - Deploy on your home server
- [Auto-Updates](deployment/auto-updates.md) - Set up automatic deployments
