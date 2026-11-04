# Data Sources

## Webcams

`src/webcams.js` fetches four public camera views concurrently:

| Camera                        | Provider page                                           | Image source                                          |
| ----------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Le Carrefour                  | [Roundshot](https://lecarrefour.roundshot.com/)         | `https://lecarrefour.roundshot.com/cams/50`           |
| Les Attelas                   | [Roundshot](https://verbier.roundshot.com/les-attelas/) | `https://verbier.roundshot.com/cams/1473`             |
| Savoleyres                    | [Roundshot](https://verbier.roundshot.com/savoleyres/)  | `https://verbier.roundshot.com/cams/1022`             |
| Village / Hôtel W near Médran | [Skaping](https://www.skaping.com/verbier/hotel-w)      | Latest dated JPEG from the page's `og:image` metadata |

The ski-area views are linked from the [official Verbier 4Vallées webcams page](https://verbier4vallees.ch/en/useful-information/webcams). The [tourist office](https://www.verbier.ch/en/practice/live/webcams/) lists Le Carrefour and the village camera.

Each camera has a 20-second download budget and a 15 MiB response limit. JPEG data is fully decoded, then resized without cropping. Sharp combines the views into one image with camera names and source credits. The report timestamp describes when the report was generated; camera providers control each snapshot's capture time.

An individual failure produces an unavailable panel, while the remaining cameras still appear. A complete outage fails the report. There is no fallback to an old saved image. Individual-camera commands return just that camera's photo.

## Historical archive

`src/teleport.js` requests the original Teleport feed with `/api/v2/frame-get?feedid=fe5nsqhtejqi&sizecode=x768`, adding `frametime` in UTC. The original live feed was unavailable during the November 2026 repair, so live reports now use the four named cameras directly.

Historical commands use Teleport only. A missing archive returns an explicit unavailable message; the bot does not label a current camera image as historical footage.

## Weather

The bot reads the [MeteoSwiss current observations CSV](https://data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv), with a 15-second timeout.

| Station     | Code | Altitude |
| ----------- | ---- | -------- |
| Les Attelas | ATT  | 2734m    |
| Montagnier  | MOB  | 839m     |

Temperature (`tre200s0`), wind (`fu3010z0`) and precipitation (`rre150z0`) determine the weather display. If weather retrieval fails, the live image can still be sent with its title. If all webcam sources fail, the update fails and is logged.

Each requested update fetches fresh data. For a scheduled broadcast, the same fetched image and observations are shared across subscribed chats.
