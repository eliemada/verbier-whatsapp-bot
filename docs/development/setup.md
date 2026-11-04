# Local Development

Use Node.js **22.22.1+**; CI tests Node 22 and 24, and the production image uses Node 24.

```bash
npm ci
npm run lint
npm run format:check
npm test
```

For integration testing, follow [Docker setup](../deployment/docker.md). `docker compose up --build -d` runs the worker and WAHA together using the same internal webhook URL as production.

To run the worker directly with `npm run dev`, configure `.env` with `WAHA_URL`, `WAHA_API_KEY`, `WAHA_SESSION`, `WEBHOOK_SECRET`, `WEBHOOK_URL` and optionally `DATA_DIR`. The webhook URL must be reachable from the WAHA container at the worker's port 3001. On Docker Desktop this may use `host.docker.internal`; host networking differs on Linux. Stop the containerized worker before starting the local one to avoid duplicate schedules or competing webhook configuration.

`npm run dev` restarts the Node worker when source files change. WAHA runs independently, so worker restarts do not reset WhatsApp authentication.

| Script                  | Purpose                  |
| ----------------------- | ------------------------ |
| `npm start`             | Run the worker           |
| `npm run dev`           | Run with Node watch mode |
| `npm test`              | Run tests once           |
| `npm run test:watch`    | Watch tests              |
| `npm run test:coverage` | Generate coverage        |
| `npm run lint`          | ESLint checks            |
| `npm run format:check`  | Prettier checks          |

Husky runs lint-staged before commits. Runtime data, `.env` and WAHA credentials must stay outside Git.
