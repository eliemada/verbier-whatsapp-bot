# Portainer Deployment

Deploy and manage the Verbier bot using Portainer's web interface.

## Deploy as Stack (Recommended)

Stacks are the best way to manage multi-container deployments.

### Create Stack

1. Go to **Stacks** → **Add stack**
2. Name it `verbier-bot`
3. Select **Web editor**
4. Paste the compose content:

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
            - verbier-data:/app/data
            - verbier-data:/app/.wwebjs_auth
        labels:
            - 'com.centurylinklabs.watchtower.enable=true'

    watchtower:
        image: containrrr/watchtower
        container_name: watchtower
        restart: unless-stopped
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock
        environment:
            - WATCHTOWER_LABEL_ENABLE=true
            - WATCHTOWER_POLL_INTERVAL=300
            - WATCHTOWER_CLEANUP=true
            - TZ=Europe/Zurich

volumes:
    verbier-data:
```

5. Click **Deploy the stack**

### View QR Code

1. Go to **Containers** → `verbier-whatsapp-bot`
2. Click **Logs**
3. Find and scan the QR code with WhatsApp

## Update Existing Deployment

If you already have the bot running and want to add Watchtower:

### Option 1: Update Stack

1. Go to **Stacks** → select your stack
2. Click **Editor**
3. Add the Watchtower service and labels (see above)
4. Click **Update the stack**
5. Enable **Re-pull image**
6. Click **Deploy**

### Option 2: Add Watchtower Separately

1. Go to **Containers** → **Add container**
2. Configure:
    - **Name:** `watchtower`
    - **Image:** `containrrr/watchtower`

3. **Volumes:**
   | Container | Host | Type |
   |-----------|------|------|
   | `/var/run/docker.sock` | `/var/run/docker.sock` | Bind |

4. **Environment variables:**

    ```
    WATCHTOWER_LABEL_ENABLE=true
    WATCHTOWER_POLL_INTERVAL=300
    WATCHTOWER_CLEANUP=true
    TZ=Europe/Zurich
    ```

5. Click **Deploy the container**

6. **Add label to your bot:**
    - Go to `verbier-whatsapp-bot` container
    - Click **Duplicate/Edit**
    - Add label: `com.centurylinklabs.watchtower.enable=true`
    - Click **Deploy**

## Manual Update (Without Watchtower)

1. Go to **Containers** → `verbier-whatsapp-bot`
2. Click **Recreate**
3. Enable **Re-pull image**
4. Click **Recreate**

## Monitoring

### View Logs

1. **Containers** → select container → **Logs**
2. Enable **Auto-refresh** to follow logs

### Container Stats

1. **Containers** → select container → **Stats**
2. View CPU, memory, and network usage

### Health Status

The container reports health status:

- **Healthy** - Bot is running
- **Unhealthy** - Node.js process crashed

## Troubleshooting

### QR Code Not Showing

1. Check logs for QR code output
2. If no QR, the session may already be authenticated
3. Delete the auth volume to force re-authentication:
    ```bash
    docker volume rm verbier-bot_verbier-data
    ```

### Container Keeps Restarting

1. Check logs for error messages
2. Common issues:
    - Missing `shm_size` (Chromium needs shared memory)
    - Corrupt auth session (delete volume and re-auth)

### Watchtower Not Updating

1. Check Watchtower logs for errors
2. Verify the label is set correctly on the bot container
3. Ensure `WATCHTOWER_LABEL_ENABLE=true` is set

## Using Portainer Webhooks

Alternative to Watchtower - trigger updates from CI:

1. Go to **Containers** → `verbier-whatsapp-bot`
2. Scroll to **Webhook**
3. Enable and copy the URL
4. Add to GitHub Actions:

```yaml
- name: Deploy to Portainer
  run: curl -X POST "${{ secrets.PORTAINER_WEBHOOK }}"
```
