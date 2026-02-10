# Docker Deployment

Run the Verbier bot in a Docker container.

## Quick Start

```bash
# First run - see QR code for authentication
docker compose up

# After authenticating, run detached
docker compose up -d

# View logs
docker compose logs -f
```

## Docker Compose

The default `docker-compose.yml` builds from source:

```yaml
services:
    verbier-bot:
        build: .
        container_name: verbier-whatsapp-bot
        restart: unless-stopped
        shm_size: '1gb'
        environment:
            - DATA_DIR=/app/data
        volumes:
            - ./data:/app/data
            - ./data:/app/.wwebjs_auth
```

## Using Pre-built Image

To use the pre-built image from GitHub Container Registry:

```yaml
services:
    verbier-bot:
        image: ghcr.io/eliemada/verbier-whatsapp-bot:latest
        container_name: verbier-whatsapp-bot
        restart: unless-stopped
        shm_size: '1gb'
        environment:
            - DATA_DIR=/app/data
        volumes:
            - ./data:/app/data
            - ./data:/app/.wwebjs_auth
```

## Multi-Architecture Support

The image is built for both architectures:

- `linux/amd64` - Standard x86 servers
- `linux/arm64` - Raspberry Pi, Apple Silicon

Docker automatically pulls the correct architecture.

## Environment Variables

| Variable   | Default     | Description                   |
| ---------- | ----------- | ----------------------------- |
| `DATA_DIR` | `/app/data` | Directory for persistent data |

## Volumes

| Container Path      | Purpose                            |
| ------------------- | ---------------------------------- |
| `/app/data`         | Chat subscriptions (`.chats.json`) |
| `/app/.wwebjs_auth` | WhatsApp session data              |

> **Important:** Both volumes should point to the same host directory to keep all data together.

## Shared Memory

The `shm_size: '1gb'` setting is required for Chromium/Puppeteer to work properly. Without it, the browser may crash.

## Health Check

The container includes a health check that verifies Node.js is running:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1
```

## Manual Docker Run

```bash
docker run -d \
    --name verbier-whatsapp-bot \
    --restart unless-stopped \
    --shm-size=1g \
    -e DATA_DIR=/app/data \
    -v $(pwd)/data:/app/data \
    -v $(pwd)/data:/app/.wwebjs_auth \
    ghcr.io/eliemada/verbier-whatsapp-bot:latest
```

## Updating

### Manual Update

```bash
docker compose pull
docker compose up -d
```

### Automatic Updates

See [Auto-Updates](auto-updates.md) for Watchtower setup.
