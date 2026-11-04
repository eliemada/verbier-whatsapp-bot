# Project Structure

| File                  | Responsibility                                                               |
| --------------------- | ---------------------------------------------------------------------------- |
| `bot.js`              | Startup, WAHA session configuration, HTTP servers and scheduled updates      |
| `src/waha.js`         | WAHA HTTP transport, session status, group lookup and delivery receipts      |
| `src/webhooks.js`     | Webhook authentication, command routing and persistent duplicate suppression |
| `src/control.js`      | Loopback operator API                                                        |
| `src/commands.js`     | Transport-independent command handlers                                       |
| `src/config.js`       | Environment, schedule and persistent chat subscriptions                      |
| `src/teleport.js`     | Live webcam fallback and historical Teleport requests                        |
| `src/weather.js`      | MeteoSwiss observations and captions                                         |
| `src/utils.js`        | Date/time parsing in the Verbier timezone                                    |
| `src/logger.js`       | Timestamped logs                                                             |
| `tests/`              | HTTP adapter, webhook, control, webcam, weather and date/time tests          |
| `compose.waha.yml`    | Shared, pinned GOWS service                                                  |
| `docker-compose*.yml` | Local and NAS bot deployment templates                                       |
| `Dockerfile`          | Node.js 24 Alpine production worker image                                    |
| `.env.example`        | Required secrets and configurable storage paths                              |

The bot data directory contains `.chats.json` and `.handled-messages.json`. WAHA's separate directory contains linked-device credentials and its database. Both directories are excluded from Git. Browser session helpers from the old whatsapp-web.js transport have been removed.
