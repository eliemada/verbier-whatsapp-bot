# Local Development Setup

Set up your development environment.

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** - For version control
- **WhatsApp account** - For testing

## Clone & Install

```bash
# Clone the repository
git clone https://github.com/eliemada/verbier-whatsapp-bot.git
cd verbier-whatsapp-bot

# Install dependencies
npm install
```

## Run the Bot

### Development Mode (with auto-reload)

```bash
npm run dev
```

Uses Node.js `--watch` flag to restart on file changes.

### Production Mode

```bash
npm start
```

## First Run

1. The bot displays a QR code in the terminal
2. Open WhatsApp → Settings → Linked Devices
3. Scan the QR code
4. Bot is now connected

Session data is saved to `.wwebjs_auth/` for future runs.

## Project Scripts

| Script          | Command                 | Description               |
| --------------- | ----------------------- | ------------------------- |
| `start`         | `npm start`             | Run the bot               |
| `dev`           | `npm run dev`           | Run with auto-reload      |
| `test`          | `npm test`              | Run tests once            |
| `test:watch`    | `npm run test:watch`    | Run tests in watch mode   |
| `test:coverage` | `npm run test:coverage` | Run tests with coverage   |
| `lint`          | `npm run lint`          | Check code with ESLint    |
| `lint:fix`      | `npm run lint:fix`      | Fix lint issues           |
| `format`        | `npm run format`        | Format code with Prettier |
| `format:check`  | `npm run format:check`  | Check formatting          |

## Code Quality Tools

### ESLint

Linting is configured in `eslint.config.js`:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Prettier

Code formatting is configured in `.prettierrc`:

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks

Husky runs lint-staged on commit:

- JavaScript files: ESLint + Prettier
- JSON/Markdown: Prettier

## Environment Variables

Create a `.env` file (optional):

```bash
# Override data directory
DATA_DIR=/custom/path

# Debug logging
DEBUG=whatsapp-web.js:*
```

## Directory Structure

```
.
├── bot.js              # Entry point
├── src/                # Source modules
├── tests/              # Test files
├── data/               # Runtime data (gitignored)
│   └── .chats.json     # Subscribed chats
├── .wwebjs_auth/       # WhatsApp session (gitignored)
└── node_modules/       # Dependencies (gitignored)
```

## Testing Your Changes

### Run Tests

```bash
# All tests
npm test

# Watch mode (re-runs on changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

### Test a Command Manually

1. Start the bot: `npm run dev`
2. Send a command from WhatsApp: `!snow help`
3. Check terminal for logs
4. Modify code → bot auto-restarts
5. Test again

## Debugging

### Enable Debug Logs

```bash
DEBUG=whatsapp-web.js:* npm run dev
```

### Common Issues

**QR code not appearing:**

- Delete `.wwebjs_auth/` and restart
- Check terminal for errors

**Commands not responding:**

- Verify message format (lowercase)
- Check logs for errors
- Ensure WhatsApp session is active

**Chromium crashes:**

- Increase shared memory: `--shm-size=1g` (Docker)
- Check system resources

## IDE Setup

### VS Code

Recommended extensions:

- ESLint
- Prettier
- EditorConfig

Settings are auto-configured via `.vscode/` (if present) or EditorConfig.

### WebStorm/IntelliJ

ESLint and Prettier are auto-detected from project config.
