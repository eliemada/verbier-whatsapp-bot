# Portainer Deployment

This stack uses Compose `include` to share `compose.waha.yml`. Use a Portainer deployment method that supports this and includes both compose files, such as a repository-backed stack with a compatible Compose version. If your Portainer version cannot resolve includes, deploy through the host's Docker Compose 2.20+ CLI instead of pasting only one file into the web editor.

Use `docker-compose.nas.yml` or `docker-compose.unraid.yml` as the entry file. Supply the variables from `.env.example` through the stack environment, including both secrets and absolute storage paths. Pin `BOT_IMAGE_TAG` to the tested image.

See [NAS setup](nas.md), then [pairing and verification](docker.md). WAHA uses the GOWS image and persistent storage; no Chromium or browser shared-memory configuration is needed.
