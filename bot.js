/**
 * Verbier WhatsApp Bot
 * Sends daily snow images from Verbier webcam with MeteoSwiss weather data.
 */

import path from 'path';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import cron from 'node-cron';
import 'dotenv/config';

import { CONFIG, chatManager } from './src/config.js';
import { log } from './src/logger.js';
import { getCurrentImage } from './src/teleport.js';
import { getWeather, formatCaption } from './src/weather.js';
import { handleMessage } from './src/commands.js';
import { cleanupBrowserLocks } from './src/session.js';
import { createControlServer } from './src/control.js';
import { getChatSummary, sendImage } from './src/messaging.js';

// =============================================================================
// Clean up stale Chromium lock files from previous crashes
// =============================================================================

const authDir = path.join(process.cwd(), '.wwebjs_auth');
for (const file of cleanupBrowserLocks(authDir)) {
    log.info(`Removed stale Chromium lock file: ${file}`);
}

// =============================================================================
// WhatsApp Client
// =============================================================================

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: authDir }),
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

let ready = false;
let pairingQr = null;
let shuttingDown = false;
const scheduledTasks = [];

client.on('qr', qr => {
    ready = false;
    pairingQr = qr;
    log.info('Scan QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    ready = true;
    pairingQr = null;
    log.info('WhatsApp bot ready');
    setupSchedule();
});

client.on('authenticated', () => {
    pairingQr = null;
    log.info('Authenticated');
});
client.on('auth_failure', msg => {
    ready = false;
    log.error('Auth failed:', msg);
    shutdown('auth_failure', 1);
});
client.on('disconnected', reason => {
    ready = false;
    log.error('WhatsApp disconnected:', reason);
    shutdown('disconnected', 1);
});
client.on('message', msg => {
    handleMessage(msg).catch(error => log.error('Message handling failed:', error.message));
});
client.on('message_ack', (message, ack) => {
    if (message.fromMe) log.info(`Message ${message.id._serialized} acknowledgement: ${ack}`);
});

async function getStatus() {
    const state = ready ? await client.getState() : null;
    return { ready: ready && state === 'CONNECTED', state, pairingRequired: Boolean(pairingQr) };
}

const control = createControlServer({
    getStatus,
    getQr: () => pairingQr,
    getChat: async id => {
        if (!ready) throw new Error('WhatsApp is not connected');
        return getChatSummary(client, id);
    },
    sendUpdate: async (chatId, title = 'Verbier bot test — current view') => {
        const [image, weather] = await Promise.all([getCurrentImage(), getWeather()]);
        const message = await sendToChat(chatId, image, formatCaption(weather, title));
        return { id: message.id._serialized, ack: message.ack };
    },
    getDelivery: async id => {
        if (!ready) throw new Error('WhatsApp is not connected');
        const message = await client.getMessageById(id);
        if (!message) throw new Error('Message not found');
        return { id: message.id._serialized, ack: message.ack };
    },
});
control.on('error', error => {
    log.error('Control server failed:', error.message);
    shutdown('control_error', 1);
});
control.listen(CONFIG.controlPort, '127.0.0.1');

// =============================================================================
// Messaging
// =============================================================================

async function sendToChat(chatId, image, caption) {
    const message = await sendImage(client, chatId, image, caption);
    log.info(`Sent to ${chatId}: ${message.id._serialized} (ack: ${message.ack})`);
    return message;
}

async function broadcast(image, caption) {
    const chatIds = chatManager.getAll();
    if (!chatIds.length) {
        throw new Error('No chats subscribed');
    }
    const results = await Promise.allSettled(chatIds.map(id => sendToChat(id, image, caption)));
    const failed = results.filter(result => result.status === 'rejected');
    for (const result of failed) log.error('Broadcast send failed:', result.reason.message);
    if (failed.length) throw new Error(`Failed to send to ${failed.length} subscribed chat(s)`);
}

async function sendScheduledUpdate(title) {
    try {
        // Use getCurrentImage for live feed instead of getImageAt
        // getImageAt with exact current time fails because the frame isn't available yet
        const [image, weather] = await Promise.all([getCurrentImage(), getWeather()]);
        const date = new Date().toLocaleDateString('en-CH', { timeZone: CONFIG.timezone });
        await broadcast(image, formatCaption(weather, `${title} - ${date}`));
    } catch (error) {
        log.error('Scheduled update failed:', error.message);
    }
}

// =============================================================================
// Schedule
// =============================================================================

function setupSchedule() {
    if (scheduledTasks.length) return;
    const { morning, noon } = CONFIG.schedule;

    scheduledTasks.push(
        cron.schedule(
            `${morning.minute} ${morning.hour} * * *`,
            () => {
                log.info('Sending morning update');
                return sendScheduledUpdate('Good morning! Verbier at 8 AM');
            },
            { timezone: CONFIG.timezone, noOverlap: true },
        ),
    );

    scheduledTasks.push(
        cron.schedule(
            `${noon.minute} ${noon.hour} * * *`,
            () => {
                log.info('Sending noon update');
                return sendScheduledUpdate('Noon update from Verbier');
            },
            { timezone: CONFIG.timezone, noOverlap: true },
        ),
    );

    log.info(`Scheduled: ${morning.hour}:00 & ${noon.hour}:00 (${CONFIG.timezone})`);
    log.info(`Subscribed chats: ${chatManager.getAll().length || 'none'}`);
}

// =============================================================================
// Graceful Shutdown
// =============================================================================

async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    ready = false;
    log.info(`Received ${signal}, shutting down...`);
    const timeout = setTimeout(() => process.exit(exitCode || 1), 10000);
    timeout.unref();
    control.close();
    for (const task of scheduledTasks) task.stop();
    try {
        await client.destroy();
        log.info('WhatsApp client closed');
    } catch (error) {
        log.error('Error during shutdown:', error.message);
    }
    process.exit(exitCode);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// =============================================================================
// Start
// =============================================================================

log.info('Starting Verbier bot...');
log.info(`Feed: ${CONFIG.feedId}`);
client.initialize().catch(error => {
    log.error('WhatsApp initialization failed:', error.message);
    shutdown('initialization_failure', 1);
});
