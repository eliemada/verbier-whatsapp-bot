export const CONFIG = Object.freeze({
    feedId: 'fe5nsqhtejqi',
    teleportApi: 'https://video.teleport.io/api/v2',
    meteoSwissUrl: 'https://data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv',
    timezone: 'Europe/Zurich',
    stations: {
        ATT: { name: 'Les Attelas', altitude: 2734 },
        MOB: { name: 'Montagnier', altitude: 839 },
    },
    schedule: {
        morning: { hour: 8, minute: 0 },
        noon: { hour: 12, minute: 0 },
    },
});

export const CHAT_IDS =
    process.env.WHATSAPP_CHAT_IDS?.split(',')
        .map(id => id.trim())
        .filter(Boolean) ?? [];
