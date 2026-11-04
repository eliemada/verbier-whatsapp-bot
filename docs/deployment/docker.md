# Docker Deployment

The stack contains the Node.js bot and WAHA **GOWS 2026.10.1**. WAHA owns the linked WhatsApp session; restarting the bot does not disconnect it.

## Configure and start

Docker Compose 2.20+ is required for the shared `compose.waha.yml` include.

```bash
cp .env.example .env
```

Set separate random `WAHA_API_KEY` and `WEBHOOK_SECRET` values in `.env` (generate each with `openssl rand -hex 32`). For production, set absolute `BOT_DATA_DIR` and `WAHA_DATA_DIR` paths and a tested `BOT_IMAGE_TAG` commit tag.

```bash
chmod 600 .env
docker compose up --build -d
```

The bot creates/configures WAHA's `default` session and authenticated webhooks. WAHA's API is published only on the Docker host's loopback address, port 3010 by default. The dashboard and Swagger UI are disabled. The webhook server on port 3001 is internal to the Compose network.

## Pair WhatsApp

Retrieve the QR on the Docker host without exposing the API key:

```bash
umask 077
docker exec verbier-waha node -e "fetch('http://127.0.0.1:3000/api/default/auth/qr?format=image', {headers:{'X-Api-Key':process.env.WAHA_API_KEY,Accept:'image/png'}}).then(async r=>{if(!r.ok)throw new Error('QR unavailable: '+r.status);process.stdout.write(Buffer.from(await r.arrayBuffer()));}).catch(e=>{console.error(e.message);process.exit(1);})" > waha-qr.png
```

Open the PNG locally and scan it from **WhatsApp → Settings → Linked Devices → Link a Device**. For a remote host, copy the PNG through SSH. QR codes expire, so retrieve a fresh image if necessary. Delete the local QR image after linking.

Inspect the bot's connection:

```bash
docker exec verbier-whatsapp-bot node -e "fetch('http://127.0.0.1:3000/health').then(async r=>{console.log(await r.json());process.exit(r.ok?0:1);})"
```

`ready: true` and `state: WORKING` mean WhatsApp is connected. The bot container is unhealthy while pairing is required. WAHA's own container health only indicates that its API is available.

If the pairing window expires and the unlinked session becomes `FAILED`, restart that session once, then retrieve its QR again:

```bash
docker exec verbier-waha node -e "fetch('http://127.0.0.1:3000/api/sessions/default/restart',{method:'POST',headers:{'X-Api-Key':process.env.WAHA_API_KEY}}).then(r=>{console.log('Restart HTTP status:',r.status);process.exit(r.ok?0:1);})"
```

Do not delete the session directory to refresh a QR. If `WAHA_SESSION` differs from `default`, substitute it in these API paths.

## Verify

Send `!snow subscribe` in the target group if it is not already subscribed. Send `!!` to request a live photo and weather. Confirm that the message arrives in the intended group.

Restart the bot and WAHA, then check health again. They should reconnect using their persisted directories without another scan:

```bash
docker compose restart verbier-bot waha
docker compose ps
```

Allow WAHA time to reconnect. Review bot logs with `docker compose logs --tail=50 verbier-bot`.

## Operator endpoints

An operator API listens on `127.0.0.1:3000` **inside the bot container**, with no published port. Access it using `docker exec` and Node's `fetch`.

| Endpoint                      | Purpose                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /health`                 | WhatsApp connection status; HTTP 503 unless connected                                            |
| `GET /qr`                     | Raw pairing QR payload when linking is required                                                  |
| `GET /chat?id=GROUP_ID`       | Verify a group's name before a test send                                                         |
| `POST /send`                  | One live image/weather update; JSON body `{"chatId":"GROUP_ID@g.us","title":"Verbier bot test"}` |
| `GET /delivery?id=MESSAGE_ID` | Read the stored acknowledgement for the returned message ID                                      |

`POST /send` does not modify subscriptions and never automatically retries a send. Acknowledgement 1 means accepted by WhatsApp, 2 means delivered, and 3 means read. Some GOWS group acknowledgements can stay at 1; confirm arrival in WhatsApp before assuming failure or resending. A timeout can be ambiguous, so inspect the group before retrying.

## Storage and backups

The bot mounts `BOT_DATA_DIR` at `/app/data`; WAHA mounts `WAHA_DATA_DIR` at `/app/.sessions`. Retain both directories across redeployments. Stop the two services before taking a consistent filesystem backup, then start them again. Protect backups as WhatsApp credentials.

For controlled upgrades and rollback, see [Updates](auto-updates.md).
