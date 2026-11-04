# Controlled Updates

The bot and WAHA opt out of Watchtower. WAHA is pinned to `gows-2026.10.1`; production should also pin `BOT_IMAGE_TAG` to the tested seven-character Git commit tag published by CI. The `latest` default is convenient for first setup but changes on each push to main.

## Upgrade

1. Review upstream release notes and confirm the new bot's CI checks passed.
2. Back up both data directories and the current compose files, `.env` and image tags.
3. Change the chosen image tag, then pull and recreate the relevant service.

```bash
docker compose pull verbier-bot waha
docker compose up -d verbier-bot waha
```

Verify WhatsApp health and a command in the intended group. A bot-only update should leave the independently running WAHA session connected. A WAHA restart should restore its session from disk.

## Rollback

Restore the saved compose files and image tags, then recreate the services. If an upstream release changed stored data incompatibly, stop the services before restoring the corresponding data backup. Avoid running the old and new bot simultaneously because both can send scheduled updates.

GitHub Actions builds the bot image on main, but publishing an image does not by itself deploy a pinned production stack.
