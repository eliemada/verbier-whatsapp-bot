# Project Structure

```
verbier-whatsapp-bot/
├── bot.js                 # Entry point
├── src/
│   ├── commands.js        # Message command handler
│   ├── config.js          # Configuration and chat manager
│   ├── logger.js          # Logging utility
│   ├── teleport.js        # Teleport.io API client
│   ├── utils.js           # Time/date parsing utilities
│   └── weather.js         # MeteoSwiss weather client
├── tests/
│   ├── utils.test.js      # Utils unit tests
│   └── weather.test.js    # Weather formatting tests
├── docs/                  # Documentation site
├── .github/
│   └── workflows/
│       ├── ci.yml         # Test & lint on PR
│       ├── docker.yml     # Build & push Docker image
│       └── security.yml   # Security scanning
├── docker-compose.yml     # Local development
├── docker-compose.nas.yml # Generic NAS deployment
├── docker-compose.unraid.yml  # Unraid deployment
├── Dockerfile             # Container build
├── package.json           # Dependencies & scripts
├── renovate.json          # Dependency updates
├── eslint.config.js       # Linting rules
├── vitest.config.js       # Test configuration
└── .prettierrc            # Code formatting
```

## Source Files

### `bot.js` (Entry Point)

Main application file that:

- Creates WhatsApp client with LocalAuth
- Sets up QR code display for authentication
- Configures scheduled broadcasts
- Starts the client

**Key exports:** None (entry point)

### `src/commands.js`

Handles all incoming WhatsApp messages:

- Command pattern matching
- Time/date parsing delegation
- Response formatting
- Error handling

**Key exports:**

- `handleMessage(msg)` - Main message handler

### `src/config.js`

Application configuration and state:

- Static config (feed ID, stations, schedule)
- Chat subscription manager with file persistence

**Key exports:**

- `CONFIG` - Static configuration object
- `chatManager` - Chat subscription CRUD operations

### `src/logger.js`

Simple timestamped logging:

- ISO 8601 timestamps
- Info and error log levels

**Key exports:**

- `log.info(...args)`
- `log.error(...args)`

### `src/teleport.js`

Teleport.io webcam API client:

- Fetches current live images
- Fetches historical images by timestamp

**Key exports:**

- `getCurrentImage()` - Returns current image buffer
- `getImageAt(hour, minute, date?)` - Returns historical image

### `src/utils.js`

Time and date parsing utilities:

- Multiple time format support (24h, 12h, keywords)
- Date parsing (MM-DD, YYYY-MM-DD)
- Timezone-aware datetime creation

**Key exports:**

- `parseTime(str)` - Parse time string
- `parseDate(str)` - Parse date string
- `createVerbierDateTime(...)` - Create Date in Verbier TZ
- `getVerbierNow()` - Current time in Verbier TZ

### `src/weather.js`

MeteoSwiss weather data client:

- Fetches and parses CSV data
- Formats weather for display

**Key exports:**

- `getWeather()` - Fetch current weather
- `formatCaption(weather, title)` - Format as message caption

## Test Files

### `tests/utils.test.js`

Comprehensive tests for time/date parsing:

- 24-hour format
- 12-hour format (with/without space)
- Special keywords (noon, midnight)
- Edge cases and error handling

### `tests/weather.test.js`

Tests for weather formatting:

- Full weather data
- Partial data (mountain/valley only)
- Null handling
- Edge cases

## Configuration Files

### `package.json`

- **type:** `module` (ES Modules)
- **engines:** Node.js >= 18
- **Scripts:** start, dev, test, lint, format

### `eslint.config.js`

Flat config ESLint 9 setup:

- Recommended rules
- Prettier integration
- Custom rules for code style

### `vitest.config.js`

Test runner configuration:

- V8 coverage provider
- Coverage reporters (text, html, lcov)

### `renovate.json`

Automated dependency updates:

- Grouped updates by category
- Automerge for minor/patch
- Manual approval for major versions

## Docker Files

### `Dockerfile`

Multi-stage build:

- Base: `node:24-slim`
- Chromium for Puppeteer
- Production dependencies only
- Health check included

### `docker-compose.yml`

Local development:

- Builds from source
- Mounts local data directory

### `docker-compose.unraid.yml`

Unraid deployment:

- Pre-built image from GHCR
- Watchtower for auto-updates
- Unraid volume paths

### `docker-compose.nas.yml`

Generic NAS deployment:

- Comments for different NAS paths
- Watchtower included
