# CI/CD Pipeline

A push to main runs these GitHub Actions workflows:

| Workflow       | Checks or output                                        |
| -------------- | ------------------------------------------------------- |
| `ci.yml`       | ESLint, Prettier and Vitest on Node.js 22 and 24        |
| `docker.yml`   | Builds Linux amd64/arm64 images and pushes to GHCR      |
| `security.yml` | Dependency audit and CodeQL analysis                    |
| `docs.yml`     | Publishes documentation when its workflow filters match |

Docker images are published as `ghcr.io/eliemada/verbier-whatsapp-bot:latest` and a seven-character commit tag, without a `sha-` prefix. Set `BOT_IMAGE_TAG` to the tested commit for production.

Publishing an image does not change a pinned deployment. Pull and recreate the service after checks pass, following the [update guide](../deployment/auto-updates.md). Both bot and WAHA opt out of Watchtower.

Run the CI checks locally with `npm run lint`, `npm run format:check` and `npm test`. Dependency audit currently reports findings without blocking the workflow; inspect its output rather than treating workflow success as a clean audit.
