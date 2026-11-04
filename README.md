# Verbier WhatsApp Bot

Sends Verbier webcam images and MeteoSwiss weather to subscribed WhatsApp chats through **WAHA with the GOWS engine**. The bot runs on Node.js 24; WhatsApp runs in a separate, persistent WAHA container without Chromium.

- Daily updates at **08:00 and 12:00 Europe/Zurich**.
- One labelled photo combines **Le Carrefour, Les Attelas, Savoleyres and the Hôtel W/Médran village view**, using the public Roundshot and Skaping feeds.
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

## Season start

Set `BOT_START_AT=2026-11-15T08:00:00+01:00` in `.env` to pause reports and command replies until 15 November 2026 at 08:00 Swiss time. Recreate the bot after changing this setting. WAHA stays connected; the bot resumes automatically at the configured instant and follows its normal 08:00/noon schedule. Paused commands are ignored, and missed reports are not replayed. Leave the value empty for immediate operation.

## Commands

| Command                                  | Description                           |
| ---------------------------------------- | ------------------------------------- |
| `!!`                                     | All webcam views and weather          |
| `!snow cameras`                          | List cameras                          |
| `!snow camera attelas`                   | One selected camera                   |
| `!snow weather`                          | Current weather                       |
| `!snow 8am`, `!snow noon`, `!snow 15:00` | Historical image at a time            |
| `!snow 11-20`, `!snow 11-20 8am`         | Historical date, optionally with time |
| `!snow subscribe`                        | Daily updates for this chat           |
| `!snow unsubscribe`                      | Stop this chat's updates              |
| `!snow status`                           | Subscription status                   |
| `!snow help`                             | Command list                          |

`!verbier` is also accepted. Imported commands older than five minutes and bot API echoes are ignored. Processed command IDs are persisted to avoid duplicate responses after webhook retries or worker restarts.

## Webcam reports

Daily reports and `!!` combine all four cameras into one JPEG with labels and source credits, preserving the full framing. If a camera fails, its panel says it is unavailable while the remaining views are still sent. If every camera fails, the bot reports/logs the error instead of sending an empty image.

Use `!snow camera carrefour`, `!snow camera attelas`, `!snow camera savoleyres` or `!snow camera village` for an individual photo. Historical commands still use the original Teleport archive, which may be unavailable.

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
