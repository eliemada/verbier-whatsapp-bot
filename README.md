# Verbier WhatsApp Bot

Sends Verbier webcam images and MeteoSwiss weather to subscribed WhatsApp chats through **WAHA with the GOWS engine**. The bot runs on Node.js 24; WhatsApp runs in a separate, persistent WAHA container without Chromium.

- Daily updates at **08:00 and 12:00 Europe/Zurich**.
- Live photos use Teleport, with the [Le Carrefour panorama](https://lecarrefour.roundshot.com/) as fallback when that feed is unavailable.
- Weather from **Les Attelas (2734m)** and **Montagnier (839m)**.
- Historical requests use Teleport archives only; unavailable footage is reported explicitly.

## Run with Docker

Requires Docker Compose 2.20+ (for `include`) and a WhatsApp account.

```bash
cp .env.example .env
```

Set separate, random `WAHA_API_KEY` and `WEBHOOK_SECRET` values in `.env`. Generate each with `openssl rand -hex 32`. Keep this file private.

```bash
docker compose up --build -d
```

Follow the [pairing and verification guide](docs/deployment/docker.md). After linking WhatsApp, send `!snow subscribe` in the intended group. Existing subscriptions in the bot data directory are retained.

For Unraid, set absolute data directories in `.env`, then use:

```bash
docker compose -f docker-compose.unraid.yml up -d
```

See [NAS deployment](docs/deployment/nas.md) and [controlled updates](docs/deployment/auto-updates.md). WAHA is pinned to `gows-2026.10.1`; pin the bot to a tested commit using `BOT_IMAGE_TAG`. Both containers opt out of Watchtower.

## Commands

| Command                                  | Description                           |
| ---------------------------------------- | ------------------------------------- |
| `!!`                                     | Current image and weather             |
| `!snow weather`                          | Current weather                       |
| `!snow 8am`, `!snow noon`, `!snow 15:00` | Historical image at a time            |
| `!snow 11-20`, `!snow 11-20 8am`         | Historical date, optionally with time |
| `!snow subscribe`                        | Daily updates for this chat           |
| `!snow unsubscribe`                      | Stop this chat's updates              |
| `!snow status`                           | Subscription status                   |
| `!snow help`                             | Command list                          |

`!verbier` is also accepted. Imported commands older than five minutes and bot API echoes are ignored. Processed command IDs are persisted to avoid duplicate responses after webhook retries or worker restarts.

## Persistent data

- `BOT_DATA_DIR`: `.chats.json` subscriptions and `.handled-messages.json` command IDs.
- `WAHA_DATA_DIR`: WhatsApp linked-device credentials and message/group storage.

Back up both directories before upgrades. Browser session files from the previous whatsapp-web.js version cannot authenticate WAHA; migration requires one new QR scan. Keep the old files for rollback.

## Development

Use Node.js 22.22.1+ (CI tests Node 22 and 24).

```bash
npm ci
npm run lint
npm run format:check
npm test
```

See [local setup](docs/development/setup.md), [architecture](docs/architecture/overview.md), and the [operator endpoints](docs/deployment/docker.md#operator-endpoints).
