# Data Sources

## Webcam

`src/teleport.js` requests the original Teleport feed with `/api/v2/frame-get?feedid=fe5nsqhtejqi&sizecode=x768`. Historical requests additionally supply `frametime` in UTC.

The original live feed was unavailable during the November 2026 repair. Live requests now fall back to the [Le Carrefour panorama in Verbier](https://lecarrefour.roundshot.com/) at `https://lecarrefour.roundshot.com/cams/50`. Each request has a 20-second timeout and validates the JPEG signature.

Historical commands use Teleport only. A missing archive returns an explicit unavailable message; the bot does not label a current fallback image as historical footage.

## Weather

The bot reads the [MeteoSwiss current observations CSV](https://data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv), with a 15-second timeout.

| Station     | Code | Altitude |
| ----------- | ---- | -------- |
| Les Attelas | ATT  | 2734m    |
| Montagnier  | MOB  | 839m     |

Temperature (`tre200s0`), wind (`fu3010z0`) and precipitation (`rre150z0`) determine the weather display. If weather retrieval fails, the live image can still be sent with its title. If both webcam sources fail, the update fails and is logged.

Each requested update fetches fresh data. For a scheduled broadcast, the same fetched image and observations are shared across subscribed chats.
