# NAS Deployment

Deploy the Verbier bot on your home NAS with automatic updates.

## Supported Platforms

- **Unraid** - Use `docker-compose.unraid.yml`
- **Synology** - Use `docker-compose.nas.yml`
- **QNAP** - Use `docker-compose.nas.yml`
- **TrueNAS** - Use `docker-compose.nas.yml`

## Unraid

### Using Docker Compose

```bash
# Download the compose file
curl -O https://raw.githubusercontent.com/eliemada/verbier-whatsapp-bot/main/docker-compose.unraid.yml

# First run - watch for QR code
docker compose -f docker-compose.unraid.yml up

# After auth, run detached
docker compose -f docker-compose.unraid.yml up -d
```

### Manual Setup in Unraid UI

1. Go to **Docker** → **Add Container**
2. Configure:
    - **Name:** `verbier-whatsapp-bot`
    - **Repository:** `ghcr.io/eliemada/verbier-whatsapp-bot:latest`
    - **Extra Parameters:** `--shm-size=1g`

3. Add paths:
   | Container Path | Host Path |
   |----------------|-----------|
   | `/app/data` | `/mnt/user/appdata/verbier-bot` |
   | `/app/.wwebjs_auth` | `/mnt/user/appdata/verbier-bot` |

4. Add environment variable:
    - `DATA_DIR=/app/data`

5. Add label (for Watchtower):
    - `com.centurylinklabs.watchtower.enable=true`

6. Click **Apply**

## Synology

### Using Docker Compose

1. SSH into your Synology
2. Create a directory for the bot:

```bash
mkdir -p /volume1/docker/verbier-bot
cd /volume1/docker/verbier-bot
```

3. Download and edit the compose file:

```bash
curl -O https://raw.githubusercontent.com/eliemada/verbier-whatsapp-bot/main/docker-compose.nas.yml
```

4. Edit the volume path:

```yaml
volumes:
    - /volume1/docker/verbier-bot/data:/app/data
    - /volume1/docker/verbier-bot/data:/app/.wwebjs_auth
```

5. Start:

```bash
docker compose -f docker-compose.nas.yml up -d
```

### Using Synology Container Manager

1. Open **Container Manager** → **Project**
2. Create new project
3. Paste the compose content (adjust paths)
4. Build and run

## QNAP

### Using Container Station

1. Open **Container Station**
2. Go to **Create** → **Create Application**
3. Paste the compose content:

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
            - /share/Container/verbier-bot:/app/data
            - /share/Container/verbier-bot:/app/.wwebjs_auth
        labels:
            - 'com.centurylinklabs.watchtower.enable=true'
```

4. Create and start

## TrueNAS Scale

1. Go to **Apps** → **Discover Apps** → **Custom App**
2. Or use the compose file via SSH:

```bash
cd /mnt/pool/apps
mkdir verbier-bot && cd verbier-bot
curl -O https://raw.githubusercontent.com/eliemada/verbier-whatsapp-bot/main/docker-compose.nas.yml

# Edit volume paths to /mnt/pool/apps/verbier-bot/data
docker compose -f docker-compose.nas.yml up -d
```

## First Run Authentication

On first run, you need to authenticate WhatsApp:

1. Run in foreground to see logs:

    ```bash
    docker compose -f docker-compose.unraid.yml up
    ```

2. Watch for the QR code in the output

3. Scan with WhatsApp:
    - Open WhatsApp → Settings → Linked Devices
    - Tap "Link a Device"
    - Scan the QR code

4. Once authenticated, restart detached:
    ```bash
    docker compose -f docker-compose.unraid.yml up -d
    ```

## Persistent Data

All data is stored in the mapped volume:

| File            | Purpose             |
| --------------- | ------------------- |
| `.chats.json`   | Subscribed chat IDs |
| `.wwebjs_auth/` | WhatsApp session    |

> **Backup tip:** Back up the entire data directory to preserve your WhatsApp session and subscriptions.

## Next Steps

- [Set up Auto-Updates](auto-updates.md) - Automatic deployments with Watchtower
- [Portainer Setup](portainer.md) - Manage via web UI
