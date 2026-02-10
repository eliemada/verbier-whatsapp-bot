# Verbier WhatsApp Bot

> Automated WhatsApp bot that sends Verbier ski resort webcam images with real-time MeteoSwiss weather data.

## Features

- **Live Webcam Images** - Current view from Verbier via [Teleport.io](https://teleport.io)
- **Real-time Weather** - Data from two MeteoSwiss stations
- **Scheduled Updates** - Daily messages at 8 AM and noon (Europe/Zurich)
- **Historical Images** - Request images from any date/time
- **Subscription System** - Subscribe any chat or group to daily updates
- **Auto-Updates** - Zero-touch deployment with Watchtower

## Weather Stations

| Station     | Altitude | Data                      |
| ----------- | -------- | ------------------------- |
| Les Attelas | 2734m    | Mountain/piste conditions |
| Montagnier  | 839m     | Valley conditions         |

## Quick Example

Send `!!` in any chat to get the current view:

```
🌨️ Current view from Verbier

⛷️ *Pistes* (2734m)
🌡️ -5°C  💨 25 km/h

🏘️ *Vallée* (839m)
🌡️ 3°C  💨 10 km/h
```

## Getting Started

- [Quick Start Guide](quickstart.md) - Get running in 5 minutes
- [Docker Deployment](deployment/docker.md) - Production deployment
- [NAS Setup](deployment/nas.md) - Unraid, Synology, QNAP
