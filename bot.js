/**
 * Verbier WhatsApp Bot
 * Sends daily snow images from Verbier webcam with MeteoSwiss weather data.
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import cron from 'node-cron';
import 'dotenv/config';

import { CONFIG, chatManager } from './src/config.js';
import { log } from './src/logger.js';
import { getImageAt } from './src/teleport.js';
import { getWeather, formatCaption } from './src/weather.js';
import { handleMessage } from './src/commands.js';

// =============================================================================
// WhatsApp Client
// =============================================================================

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
        ],
    },
});

client.on('qr', qr => {
    log.info('QR code received, displaying...');
    qrcode.generate(qr, { small: true });
    console.log(''); // Flush output
});

// Pairing code authentication (alternative to QR)
const PHONE_NUMBER = process.env.PHONE_NUMBER;
if (PHONE_NUMBER) {
    client.on('loading_screen', async () => {
        const code = await client.requestPairingCode(PHONE_NUMBER);
        log.info(`Pairing code for ${PHONE_NUMBER}: ${code}`);
    });
}

client.on('ready', () => {
    log.info('WhatsApp bot ready');
    setupSchedule();
});

client.on('authenticated', () => log.info('Authenticated'));
client.on('auth_failure', msg => log.error('Auth failed:', msg));
client.on('message', handleMessage);

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
    const chatIds = chatManager.getAll();
    if (!chatIds.length) {
        log.error('No chats subscribed');
        return;
    }
    await Promise.all(chatIds.map(id => sendToChat(id, image, caption)));
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
    log.info(`Subscribed chats: ${chatManager.getAll().length || 'none'}`);
}

// =============================================================================
// Start
// =============================================================================

log.info('Starting Verbier bot...');
log.info(`Feed: ${CONFIG.feedId}`);

client.on('loading_screen', (percent, message) => {
    log.info(`Loading: ${percent}% - ${message}`);
});

client.initialize().catch(err => {
    log.error('Failed to initialize:', err.message);
});
