/**
 * Verbier WhatsApp Bot
 * Sends daily snow images from Verbier webcam with MeteoSwiss weather data.
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import cron from 'node-cron';
import 'dotenv/config';

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = Object.freeze({
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

const CHAT_IDS =
    process.env.WHATSAPP_CHAT_IDS?.split(',')
        .map(id => id.trim())
        .filter(Boolean) ?? [];

// =============================================================================
// Utilities
// =============================================================================

const log = {
    info: (...args) => console.log(`[${new Date().toISOString()}]`, ...args),
    error: (...args) => console.error(`[${new Date().toISOString()}] ERROR:`, ...args),
};

/**
 * Creates a Date object for a specific time in Verbier timezone.
 * @param {number} year
 * @param {number} month - 1-indexed
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @returns {Date} UTC Date
 */
function createVerbierDateTime(year, month, day, hour, minute) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    const localDate = new Date(dateStr);
    const utcDate = new Date(`${dateStr}Z`);
    const offset =
        new Date(utcDate.toLocaleString('en-US', { timeZone: CONFIG.timezone })) - utcDate;
    return new Date(localDate.getTime() - offset);
}

function getVerbierNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: CONFIG.timezone }));
}

/**
 * Parses time string into hour and minute.
 * Supports: "8am", "3pm", "15:00", "8:30"
 * @param {string} timeStr
 * @returns {{ hour: number, minute: number, label: string } | null}
 */
function parseTime(timeStr) {
    if (!timeStr) return null;

    // Handle HH:MM format
    const hhmmMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmmMatch) {
        const [, h, m] = hhmmMatch.map(Number);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            return { hour: h, minute: m, label: timeStr };
        }
    }

    // Handle 8am/3pm format
    const ampmMatch = timeStr.match(/^(\d{1,2})(am|pm)$/i);
    if (ampmMatch) {
        let h = parseInt(ampmMatch[1], 10);
        const isPM = ampmMatch[2].toLowerCase() === 'pm';
        if (isPM && h !== 12) h += 12;
        if (!isPM && h === 12) h = 0;
        if (h >= 0 && h <= 23) {
            return { hour: h, minute: 0, label: timeStr.toUpperCase() };
        }
    }

    // Handle named times
    if (timeStr === 'noon' || timeStr === '12pm') {
        return { hour: 12, minute: 0, label: 'noon' };
    }

    return null;
}

/**
 * Parses date string into YYYY-MM-DD format.
 * Supports: "11-20" (MM-DD), "2025-11-20" (YYYY-MM-DD)
 * @param {string} dateStr
 * @returns {string | null}
 */
function parseDate(dateStr) {
    if (/^\d{2}-\d{2}$/.test(dateStr)) {
        return `${new Date().getFullYear()}-${dateStr}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    return null;
}

// =============================================================================
// Teleport.io API
// =============================================================================

/**
 * Fetches an image from Teleport.io.
 * @param {number | null} frametime - Unix timestamp in seconds, or null for current
 * @returns {Promise<Buffer>}
 */
async function fetchImage(frametime = null) {
    const url = new URL(`${CONFIG.teleportApi}/frame-get`);
    url.searchParams.set('feedid', CONFIG.feedId);
    url.searchParams.set('sizecode', 'x768');
    if (frametime) url.searchParams.set('frametime', String(frametime));

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Teleport API error: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

async function getCurrentImage() {
    return fetchImage();
}

/**
 * Gets image at a specific time.
 * @param {number} hour
 * @param {number} minute
 * @param {string | null} dateStr - YYYY-MM-DD format
 */
async function getImageAt(hour, minute = 0, dateStr = null) {
    const now = getVerbierNow();
    const [year, month, day] = dateStr
        ? dateStr.split('-').map(Number)
        : [now.getFullYear(), now.getMonth() + 1, now.getDate()];

    let target = createVerbierDateTime(year, month, day, hour, minute);

    // If time is in the future and no specific date, use yesterday
    if (!dateStr && target > new Date()) {
        target = new Date(target.getTime() - 86400000);
    }

    return fetchImage(Math.floor(target.getTime() / 1000));
}

// =============================================================================
// MeteoSwiss API
// =============================================================================

/**
 * @typedef {Object} StationData
 * @property {number | null} temp
 * @property {number | null} wind
 * @property {number} precip
 * @property {string} name
 * @property {number} altitude
 */

/**
 * @typedef {Object} WeatherData
 * @property {StationData | null} mountain
 * @property {StationData | null} valley
 * @property {string} emoji
 */

/**
 * Fetches current weather from MeteoSwiss.
 * @returns {Promise<WeatherData | null>}
 */
async function getWeather() {
    try {
        const response = await fetch(CONFIG.meteoSwissUrl);
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

function getWeatherEmoji(temp, precip) {
    if (precip > 0 && temp <= 0) return '🌨️';
    if (precip > 0) return '🌧️';
    if (temp <= -10) return '🥶';
    if (temp <= 0) return '❄️';
    if (temp >= 25) return '☀️';
    return '⛰️';
}

/**
 * Formats weather data as a caption.
 * @param {WeatherData | null} weather
 * @param {string} title
 */
function formatCaption(weather, title) {
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

// =============================================================================
// WhatsApp Client
// =============================================================================

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] },
});

client.on('qr', qr => {
    log.info('Scan QR code:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    log.info('WhatsApp bot ready');
    setupSchedule();
});

client.on('authenticated', () => log.info('Authenticated'));
client.on('auth_failure', msg => log.error('Auth failed:', msg));

// =============================================================================
// Messaging
// =============================================================================

async function sendToChat(chatId, image, caption) {
    try {
        const chat = await client.getChatById(chatId);
        const media = new MessageMedia('image/jpeg', image.toString('base64'), 'verbier.jpg');
        await chat.sendMessage(media, { caption });
        log.info(`Sent to ${chat.name}`);
        return true;
    } catch (error) {
        log.error(`Failed to send to ${chatId}:`, error.message);
        return false;
    }
}

async function broadcast(image, caption) {
    if (!CHAT_IDS.length) {
        log.error('No WHATSAPP_CHAT_IDS configured');
        return;
    }
    await Promise.all(CHAT_IDS.map(id => sendToChat(id, image, caption)));
}

async function sendScheduledUpdate(hour, minute, title) {
    try {
        const [image, weather] = await Promise.all([getImageAt(hour, minute), getWeather()]);
        const date = new Date().toLocaleDateString('en-CH');
        await broadcast(image, formatCaption(weather, `${title} - ${date}`));
    } catch (error) {
        log.error('Scheduled update failed:', error.message);
    }
}

// =============================================================================
// Schedule
// =============================================================================

function setupSchedule() {
    const { morning, noon } = CONFIG.schedule;

    cron.schedule(
        `${morning.minute} ${morning.hour} * * *`,
        () => {
            log.info('Sending morning update');
            sendScheduledUpdate(morning.hour, morning.minute, 'Good morning! Verbier at 8 AM');
        },
        { timezone: CONFIG.timezone },
    );

    cron.schedule(
        `${noon.minute} ${noon.hour} * * *`,
        () => {
            log.info('Sending noon update');
            sendScheduledUpdate(noon.hour, noon.minute, 'Noon update from Verbier');
        },
        { timezone: CONFIG.timezone },
    );

    log.info(`Scheduled: ${morning.hour}:00 & ${noon.hour}:00 (${CONFIG.timezone})`);
    log.info(`Target chats: ${CHAT_IDS.length || 'none'}`);
}

// =============================================================================
// Command Handlers
// =============================================================================

const commands = {
    async '!!'(msg) {
        const [image, weather] = await Promise.all([getCurrentImage(), getWeather()]);
        const media = new MessageMedia('image/jpeg', image.toString('base64'), 'verbier.jpg');
        await msg.reply(media, null, {
            caption: formatCaption(weather, 'Current view from Verbier'),
        });
    },

    async '!snow 8am'(msg) {
        const image = await getImageAt(8, 0);
        const media = new MessageMedia('image/jpeg', image.toString('base64'), 'verbier_8am.jpg');
        await msg.reply(media, null, { caption: 'Verbier at 8 AM today' });
    },

    async '!snow noon'(msg) {
        const image = await getImageAt(12, 0);
        const media = new MessageMedia('image/jpeg', image.toString('base64'), 'verbier_noon.jpg');
        await msg.reply(media, null, { caption: 'Verbier at noon today' });
    },

    async '!snow weather'(msg) {
        const weather = await getWeather();
        if (!weather) {
            await msg.reply('Sorry, failed to fetch weather data.');
            return;
        }

        const lines = [`*Verbier Weather* ${weather.emoji}`, ''];
        if (weather.mountain) {
            lines.push(
                `⛷️ *Pistes* (${weather.mountain.altitude}m)`,
                `🌡️ ${weather.mountain.temp}°C`,
                `💨 ${weather.mountain.wind} km/h`,
                '',
            );
        }
        if (weather.valley) {
            lines.push(
                `🏘️ *Vallée* (${weather.valley.altitude}m)`,
                `🌡️ ${weather.valley.temp}°C`,
                `💨 ${weather.valley.wind} km/h`,
            );
        }
        lines.push('', '_Source: MeteoSwiss_');
        await msg.reply(lines.join('\n'));
    },

    async '!snow chatid'(msg) {
        const chat = await msg.getChat();
        await msg.reply(
            `*Chat ID:* \`${chat.id._serialized}\`\n\nAdd to .env:\nWHATSAPP_CHAT_IDS=${chat.id._serialized}`,
        );
    },

    async '!snow help'(msg) {
        await msg.reply(
            [
                '*Verbier Snow Bot*',
                '',
                '!! - Current live image',
                '!snow weather - Weather',
                '!snow 8am - Today 8 AM',
                '!snow noon - Today noon',
                '!snow 15:00 - Today at time',
                '!snow 11-20 - Date at noon',
                '!snow 11-20 8am - Date at time',
                '!snow chatid - Get chat ID',
            ].join('\n'),
        );
    },
};

// Aliases
commands['!verbier 8am'] = commands['!snow 8am'];
commands['!verbier noon'] = commands['!snow noon'];
commands['!verbier weather'] = commands['!snow weather'];
commands['!verbier chatid'] = commands['!snow chatid'];
commands['!verbier help'] = commands['!snow help'];

// =============================================================================
// Message Router
// =============================================================================

client.on('message', async msg => {
    const body = msg.body.toLowerCase().trim();

    try {
        // Direct command match
        if (commands[body]) {
            await commands[body](msg);
            return;
        }

        // !snow HH:MM or !snow Xam/pm - today at time
        const timeOnlyMatch = body.match(/^!(snow|verbier)\s+(\d{1,2}:\d{2}|\d{1,2}(?:am|pm))$/i);
        if (timeOnlyMatch) {
            const time = parseTime(timeOnlyMatch[2]);
            if (time) {
                const image = await getImageAt(time.hour, time.minute);
                const media = new MessageMedia(
                    'image/jpeg',
                    image.toString('base64'),
                    'verbier.jpg',
                );
                await msg.reply(media, null, { caption: `Verbier today at ${time.label}` });
            }
            return;
        }

        // !snow MM-DD [time] or !snow YYYY-MM-DD [time] - historical
        const dateMatch = body.match(/^!(snow|verbier)\s+(\d{2,4}-\d{2}(?:-\d{2})?)\s*(.*)$/i);
        if (dateMatch) {
            const date = parseDate(dateMatch[2]);
            if (!date) {
                await msg.reply('Invalid date format. Use MM-DD or YYYY-MM-DD');
                return;
            }

            const time = parseTime(dateMatch[3]) ?? { hour: 12, minute: 0, label: 'noon' };
            const image = await getImageAt(time.hour, time.minute, date);
            const media = new MessageMedia('image/jpeg', image.toString('base64'), 'verbier.jpg');
            await msg.reply(media, null, { caption: `Verbier on ${date} at ${time.label}` });
            return;
        }
    } catch (error) {
        log.error('Command error:', error.message);
        await msg.reply('Sorry, something went wrong.');
    }
});

// =============================================================================
// Start
// =============================================================================

log.info('Starting Verbier bot...');
log.info(`Feed: ${CONFIG.feedId}`);
client.initialize();
