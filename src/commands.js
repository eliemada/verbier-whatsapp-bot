import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;

import { getCurrentImage, getImageAt } from './teleport.js';
import { getWeather, formatCaption } from './weather.js';
import { parseTime, parseDate } from './utils.js';
import { chatManager } from './config.js';
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

    async '!snow subscribe'(msg) {
        const chatId = msg.from;

        if (chatManager.has(chatId)) {
            await msg.reply('This chat is already subscribed to daily updates.');
            return;
        }

        chatManager.add(chatId);
        await msg.reply(
            `✅ Subscribed!\n\nThis chat will now receive daily updates at 8 AM and noon.\n\nUse \`!snow unsubscribe\` to stop.`,
        );
        log.info(`Chat subscribed: ${chatId}`);
    },

    async '!snow unsubscribe'(msg) {
        const chatId = msg.from;

        if (!chatManager.has(chatId)) {
            await msg.reply('This chat is not subscribed to daily updates.');
            return;
        }

        chatManager.remove(chatId);
        await msg.reply(`❌ Unsubscribed.\n\nThis chat will no longer receive daily updates.`);
        log.info(`Chat unsubscribed: ${chatId}`);
    },

    async '!snow status'(msg) {
        const chatId = msg.from;
        const isSubscribed = chatManager.has(chatId);
        const totalChats = chatManager.getAll().length;

        await msg.reply(
            [
                `*Bot Status*`,
                '',
                `📍 This chat: ${isSubscribed ? '✅ Subscribed' : '❌ Not subscribed'}`,
                `📊 Total subscribed chats: ${totalChats}`,
                '',
                isSubscribed
                    ? 'Use `!snow unsubscribe` to stop updates.'
                    : 'Use `!snow subscribe` to get daily updates.',
            ].join('\n'),
        );
    },

    async '!snow chatid'(msg) {
        await msg.reply(`*Chat ID:* \`${msg.from}\``);
    },

    async '!snow help'(msg) {
        await msg.reply(
            [
                '*Verbier Snow Bot*',
                '',
                '*Images*',
                '!! - Current live image',
                '!snow 8am - Today at 8 AM',
                '!snow 3 pm - Today at 3 PM',
                '!snow 15 - Today at 15:00',
                '!snow 9:30am - Today at 9:30 AM',
                '!snow noon - Today at noon',
                '!snow 11-20 - Nov 20 at noon',
                '!snow 11-20 8am - Nov 20 at 8 AM',
                '',
                '*Weather*',
                '!snow weather - Current conditions',
                '',
                '*Subscriptions*',
                '!snow subscribe - Daily updates',
                '!snow unsubscribe - Stop updates',
                '!snow status - Check subscription',
            ].join('\n'),
        );
    },
};

// Aliases
commands['!verbier 8am'] = commands['!snow 8am'];
commands['!verbier noon'] = commands['!snow noon'];
commands['!verbier weather'] = commands['!snow weather'];
commands['!verbier subscribe'] = commands['!snow subscribe'];
commands['!verbier unsubscribe'] = commands['!snow unsubscribe'];
commands['!verbier status'] = commands['!snow status'];
commands['!verbier chatid'] = commands['!snow chatid'];
commands['!verbier help'] = commands['!snow help'];

/**
 * Handle incoming message.
 */
export async function handleMessage(msg) {
    const body = msg.body?.toLowerCase().trim();

    // Skip non-commands early
    if (
        !body ||
        (!body.startsWith('!!') && !body.startsWith('!snow') && !body.startsWith('!verbier'))
    ) {
        return;
    }

    try {
        // Direct command match
        if (commands[body]) {
            await commands[body](msg);
            return;
        }

        // !snow <time> - today at time
        // Supports: 15, 15:00, 3am, 3 am, 3:30pm, 3:30 pm, noon, midnight
        const timeOnlyMatch = body.match(
            /^!(snow|verbier)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)$/i,
        );
        if (timeOnlyMatch) {
            const time = parseTime(timeOnlyMatch[2]);
            if (!time) {
                await msg.reply('Invalid time format. Try: 8am, 3 pm, 15:00, noon');
                return;
            }
            const image = await getImageAt(time.hour, time.minute);
            const media = new MessageMedia('image/jpeg', image.toString('base64'), 'verbier.jpg');
            await msg.reply(media, null, { caption: `Verbier today at ${time.label}` });
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

            const timeStr = dateMatch[3]?.trim();
            if (timeStr) {
                const time = parseTime(timeStr);
                if (!time) {
                    await msg.reply('Invalid time format. Try: 8am, 3 pm, 15:00, noon');
                    return;
                }
                const image = await getImageAt(time.hour, time.minute, date);
                const media = new MessageMedia(
                    'image/jpeg',
                    image.toString('base64'),
                    'verbier.jpg',
                );
                await msg.reply(media, null, { caption: `Verbier on ${date} at ${time.label}` });
            } else {
                const image = await getImageAt(12, 0, date);
                const media = new MessageMedia(
                    'image/jpeg',
                    image.toString('base64'),
                    'verbier.jpg',
                );
                await msg.reply(media, null, { caption: `Verbier on ${date} at noon` });
            }
            return;
        }

        // Unknown !snow/!verbier command
        if (body.startsWith('!snow') || body.startsWith('!verbier')) {
            await msg.reply('Unknown command. Type !snow help for available commands.');
        }
    } catch (error) {
        log.error('Command error:', error.message, error.stack);

        // Provide specific error messages
        if (error.message.includes('Historical footage not available')) {
            await msg.reply('Historical footage not available for this time.');
        } else if (error.message.includes('Teleport API')) {
            await msg.reply('Unable to fetch image. Please try again later.');
        } else {
            await msg.reply('Sorry, something went wrong.');
        }
    }
}
