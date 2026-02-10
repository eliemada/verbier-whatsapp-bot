# Architecture Overview

How the Verbier WhatsApp bot works internally.

## System Diagram

```mermaid
flowchart TB
    subgraph bot["Verbier Bot"]
        entry["bot.js<br/>(entry point)"]
        commands["commands.js<br/>(handler)"]
        scheduler["node-cron<br/>(scheduler)"]
        wa["WhatsApp Client<br/>(whatsapp-web.js)"]

        entry --> wa
        entry --> scheduler
        wa --> commands
        scheduler --> wa
    end

    subgraph external["External Services"]
        whatsapp["WhatsApp Web"]
        teleport["Teleport.io<br/>(webcam)"]
        meteo["MeteoSwiss<br/>(weather)"]
    end

    wa <--> whatsapp
    commands --> teleport
    commands --> meteo
```

## Core Components

### 1. WhatsApp Client (`bot.js`)

The entry point that:

- Initializes the WhatsApp Web client via Puppeteer
- Handles authentication (QR code generation)
- Sets up scheduled tasks
- Broadcasts messages to subscribed chats

### 2. Command Handler (`commands.js`)

Processes incoming messages:

- Pattern matching for commands (`!!`, `!snow`, `!verbier`)
- Time/date parsing for historical images
- Subscription management
- Error handling with user-friendly messages

### 3. Teleport Integration (`teleport.js`)

Fetches webcam images:

- Current live image endpoint
- Historical image retrieval with timestamp
- Returns raw image buffer

### 4. Weather Service (`weather.js`)

Fetches and formats weather data:

- Parses MeteoSwiss CSV data
- Extracts temperature, wind, precipitation
- Formats captions with emojis

### 5. Configuration (`config.js`)

Manages:

- Static configuration (feed ID, timezone, schedule)
- Chat subscription persistence (JSON file)

## Data Flow

### Incoming Message

```mermaid
sequenceDiagram
    participant User
    participant WhatsApp
    participant Bot as bot.js
    participant Cmd as commands.js
    participant Tel as teleport.js
    participant Met as weather.js

    User->>WhatsApp: "!snow 8am"
    WhatsApp->>Bot: Message event
    Bot->>Cmd: handleMessage()
    Cmd->>Cmd: Parse command

    par Fetch data
        Cmd->>Tel: getImageAt(8, 0)
        Tel-->>Cmd: Image buffer
    and
        Cmd->>Met: getWeather()
        Met-->>Cmd: Weather data
    end

    Cmd->>Cmd: Format response
    Cmd->>WhatsApp: Send image + caption
    WhatsApp->>User: Display message
```

### Scheduled Broadcast

```mermaid
sequenceDiagram
    participant Cron as node-cron
    participant Bot as bot.js
    participant Tel as teleport.js
    participant Met as weather.js
    participant Cfg as config.js
    participant WA as WhatsApp

    Cron->>Bot: Trigger (8:00 AM)

    par Fetch data
        Bot->>Tel: getCurrentImage()
        Tel-->>Bot: Image buffer
    and
        Bot->>Met: getWeather()
        Met-->>Bot: Weather data
    end

    Bot->>Cfg: getAll() subscribed chats
    Cfg-->>Bot: Chat IDs

    loop Each subscribed chat
        Bot->>WA: Send image + caption
    end
```

## Technology Stack

| Component     | Technology                       |
| ------------- | -------------------------------- |
| Runtime       | Node.js 18+                      |
| Module System | ES Modules                       |
| WhatsApp      | whatsapp-web.js (Puppeteer)      |
| Scheduling    | node-cron                        |
| HTTP          | Native fetch API                 |
| Testing       | Vitest                           |
| Linting       | ESLint 9 + Prettier              |
| Container     | Docker (Node 24-slim + Chromium) |

## Deployment Architecture

```mermaid
flowchart LR
    subgraph dev["Development"]
        code["Source Code"]
        git["Git Push"]
    end

    subgraph ci["GitHub Actions"]
        test["Test & Lint"]
        build["Build Image"]
        push["Push to GHCR"]
    end

    subgraph registry["Container Registry"]
        ghcr["ghcr.io/eliemada/<br/>verbier-whatsapp-bot"]
    end

    subgraph nas["Your NAS"]
        watchtower["Watchtower"]
        container["Bot Container"]
    end

    code --> git
    git --> test
    test --> build
    build --> push
    push --> ghcr
    ghcr -.->|"polls every 5min"| watchtower
    watchtower -->|"pulls & restarts"| container
```

## Key Design Decisions

### Why whatsapp-web.js?

- Full WhatsApp Web API access
- No official WhatsApp Business API needed
- Works with personal WhatsApp accounts
- Puppeteer provides reliable browser automation

### Why node-cron?

- Simple, reliable scheduling
- Timezone support (Europe/Zurich)
- No external dependencies

### Why ES Modules?

- Modern JavaScript standard
- Better tree shaking
- Native async/await support
- Cleaner import/export syntax

### Why JSON file for subscriptions?

- Simple persistence without database
- Easy to backup and restore
- Human-readable for debugging
- Sufficient for small-scale usage
