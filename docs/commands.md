# Commands

All bot commands. Both `!snow` and `!verbier` prefixes work.

## Quick Reference

| Command             | Description                |
| ------------------- | -------------------------- |
| `!!`                | All webcam views + weather |
| `!snow weather`     | Weather only               |
| `!snow subscribe`   | Subscribe to daily updates |
| `!snow unsubscribe` | Unsubscribe from updates   |
| `!snow status`      | Check subscription status  |
| `!snow help`        | Show help message          |

## Image Commands

### Current Image

```
!!
```

Returns one labelled image combining Le Carrefour, Les Attelas, Savoleyres and the Hôtel W/Médran village camera, with weather data. A failed camera is marked unavailable; the other views are still included.

### Individual Cameras

```
!snow cameras
!snow camera carrefour
!snow camera attelas
!snow camera savoleyres
!snow camera village
```

`!snow cameras` lists the available views. `!snow camera <name>` returns one camera photo with its source link. These commands also accept `!verbier`.

When `BOT_START_AT` is set to a future date, reports and all command replies remain paused until that instant.

### Specific Time Today

```
!snow 8am
!snow noon
!snow 3pm
!snow 15:00
!snow 9:30am
```

Supported formats:

- 24-hour: `15`, `15:00`, `9:30`
- 12-hour: `3pm`, `3 pm`, `3:30pm`, `3:30 pm`
- Keywords: `noon`, `midnight`

### Historical Images

Historical views rely on the original Teleport archive. Missing footage is reported explicitly; a current image is never substituted.

```
!snow 11-20           # November 20 at noon
!snow 11-20 8am       # November 20 at 8 AM
!snow 2024-11-20      # Full date format
!snow 2024-11-20 3pm  # Full date with time
```

Date formats:

- `MM-DD` - Uses current year
- `YYYY-MM-DD` - Full date

## Weather Commands

### Current Weather

```
!snow weather
```

Returns weather data without image:

```
*Verbier Weather* ❄️

⛷️ *Pistes* (2734m)
🌡️ -5°C
💨 25 km/h

🏘️ *Vallée* (839m)
🌡️ 3°C
💨 10 km/h

_Source: MeteoSwiss_
```

### Weather Emojis

| Emoji | Condition                |
| ----- | ------------------------ |
| 🌨️    | Precipitation + freezing |
| 🌧️    | Precipitation            |
| 🥶    | Below -10°C              |
| ❄️    | Below 0°C                |
| ☀️    | Above 25°C               |
| ⛰️    | Default                  |

## Subscription Commands

### Subscribe

```
!snow subscribe
```

Subscribes the current chat to daily updates at:

- **8:00 AM** - Morning update
- **12:00 PM** - Noon update

Times are in Europe/Zurich timezone.

### Unsubscribe

```
!snow unsubscribe
```

Stops daily updates for the current chat.

### Check Status

```
!snow status
```

Shows subscription status and total subscribed chats.

## Utility Commands

### Get Chat ID

```
!snow chatid
```

Returns the WhatsApp chat ID (useful for debugging).

### Help

```
!snow help
```

Shows the help message with available commands.

## Aliases

All commands work with both prefixes:

- `!snow <command>`
- `!verbier <command>`
