import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;

import { getCurrentImage, getImageAt } from './teleport.js';
import { getWeather, formatCaption } from './weather.js';
import { parseTime, parseDate } from './utils.js';
import { log } from './logger.js';

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

/**
 * Handle incoming message.
 */
export async function handleMessage(msg) {
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
        }
    } catch (error) {
        log.error('Command error:', error.message);
        await msg.reply('Sorry, something went wrong.');
    }
}
