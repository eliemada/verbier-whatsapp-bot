import { CONFIG } from './config.js';
import { log } from './logger.js';

function getWeatherEmoji(temp, precip) {
    if (precip > 0 && temp <= 0) return '🌨️';
    if (precip > 0) return '🌧️';
    if (temp <= -10) return '🥶';
    if (temp <= 0) return '❄️';
    if (temp >= 25) return '☀️';
    return '⛰️';
}

/**
 * Fetches current weather from MeteoSwiss.
 */
export async function getWeather() {
    try {
        const response = await fetch(CONFIG.meteoSwissUrl, {
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`MeteoSwiss API error: ${response.status}`);

        const csv = await response.text();
        const [headerLine, ...dataLines] = csv.trim().split('\n');
        const headers = headerLine.split(';');

        const col = {
            temp: headers.indexOf('tre200s0'),
            wind: headers.indexOf('fu3010z0'),
            precip: headers.indexOf('rre150z0'),
        };

        const result = { mountain: null, valley: null, emoji: '⛰️' };

        for (const [code, info] of Object.entries(CONFIG.stations)) {
            const line = dataLines.find(l => l.startsWith(`${code};`));
            if (!line) continue;

            const values = line.split(';');
            const temp = parseFloat(values[col.temp]);
            const wind = parseFloat(values[col.wind]);
            const precip = parseFloat(values[col.precip]) || 0;

            const data = {
                temp: Number.isFinite(temp) ? Math.round(temp) : null,
                wind: Number.isFinite(wind) ? Math.round(wind) : null,
                precip,
                name: info.name,
                altitude: info.altitude,
            };

            if (code === 'ATT') result.mountain = data;
            if (code === 'MOB') result.valley = data;
        }

        result.emoji = getWeatherEmoji(result.mountain?.temp ?? 0, result.mountain?.precip ?? 0);
        return result;
    } catch (error) {
        log.error('Weather fetch failed:', error.message);
        return null;
    }
}

/**
 * Formats weather data as a caption.
 */
export function formatCaption(weather, title) {
    if (!weather) return title;

    const lines = [`${weather.emoji} ${title}`, ''];

    if (weather.mountain) {
        lines.push(
            `⛷️ *Pistes* (${weather.mountain.altitude}m)`,
            `🌡️ ${weather.mountain.temp}°C  💨 ${weather.mountain.wind} km/h`,
        );
    }

    if (weather.valley) {
        lines.push(
            '',
            `🏘️ *Vallée* (${weather.valley.altitude}m)`,
            `🌡️ ${weather.valley.temp}°C  💨 ${weather.valley.wind} km/h`,
        );
    }

    return lines.join('\n');
}
