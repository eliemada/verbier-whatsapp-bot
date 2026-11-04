/** Verbier webcam/weather bot. WAHA owns the WhatsApp session. */
import cron from 'node-cron';
import { CONFIG, chatManager } from './src/config.js';
import { log } from './src/logger.js';
import { getCurrentImage } from './src/teleport.js';
import { getWeather, formatCaption } from './src/weather.js';
import { handleMessage } from './src/commands.js';
import { createControlServer } from './src/control.js';
import { WahaClient } from './src/waha.js';
import { createCommandHandler, createWebhookServer } from './src/webhooks.js';

if (!CONFIG.wahaApiKey || !CONFIG.webhookSecret) {
    throw new Error('WAHA_API_KEY and WEBHOOK_SECRET must be set');
}

const client = new WahaClient({
    baseUrl: CONFIG.wahaUrl,
    apiKey: CONFIG.wahaApiKey,
    session: CONFIG.wahaSession,
});
const webhookConfig = {
    gows: { storage: { messages: true, groups: true, chats: true } },
    webhooks: [
        {
            url: CONFIG.webhookUrl,
            events: ['message.any', 'message.ack', 'message.ack.group', 'session.status'],
            customHeaders: [{ name: 'X-Webhook-Key', value: CONFIG.webhookSecret }],
            retries: { delaySeconds: 5, attempts: 3, policy: 'constant' },
        },
    ],
};

async function sendToChat(chatId, image, caption) {
    const message = await client.sendImage(chatId, image, caption);
    log.info(`Sent to ${chatId}: ${message.id} (ack: ${message.ack ?? 'pending'})`);
    return { id: message.id, ack: message.ack, ackName: message.ackName };
}

async function currentUpdate(chatId, title = 'Verbier bot test — current view') {
    const [image, weather] = await Promise.all([getCurrentImage(), getWeather()]);
    return sendToChat(chatId, image, formatCaption(weather, title));
}

const control = createControlServer({
    getStatus: () => client.getStatus(),
    getQr: () => client.getQr(),
    getChat: id => client.getChat(id),
    getDelivery: id => client.getDelivery(id),
    sendUpdate: currentUpdate,
});
const webhooks = createWebhookServer({
    secret: CONFIG.webhookSecret,
    onEvent: createCommandHandler({
        client,
        session: CONFIG.wahaSession,
        dataDir: CONFIG.dataDir,
        handleMessage,
    }),
});
control.listen(CONFIG.controlPort, '127.0.0.1');
webhooks.listen(CONFIG.webhookPort, '0.0.0.0');

async function sendScheduledUpdate(title) {
    try {
        if (!(await client.getStatus()).ready) throw new Error('WhatsApp is not connected');
        const chatIds = chatManager.getAll();
        if (!chatIds.length) throw new Error('No chats subscribed');
        const [image, weather] = await Promise.all([getCurrentImage(), getWeather()]);
        const date = new Date().toLocaleDateString('en-CH', { timeZone: CONFIG.timezone });
        const caption = formatCaption(weather, `${title} - ${date}`);
        const results = await Promise.allSettled(chatIds.map(id => sendToChat(id, image, caption)));
        for (const result of results) {
            if (result.status === 'rejected') {
                log.error('Scheduled send failed:', result.reason.message);
            }
        }
    } catch (error) {
        log.error('Scheduled update failed:', error.message);
    }
}

const scheduledTasks = [
    [CONFIG.schedule.morning, 'Good morning! Verbier at 8 AM'],
    [CONFIG.schedule.noon, 'Noon update from Verbier'],
].map(([time, title]) =>
    cron.schedule(`${time.minute} ${time.hour} * * *`, () => sendScheduledUpdate(title), {
        timezone: CONFIG.timezone,
        noOverlap: true,
    }),
);

let connecting = false;
let configured = false;
async function connect() {
    if (connecting || configured) return;
    connecting = true;
    try {
        const session = await client.ensureSession(webhookConfig);
        configured = true;
        log.info(`WAHA session configured: ${session.status}`);
    } catch (error) {
        log.error('Waiting for WAHA:', error.message);
    } finally {
        connecting = false;
    }
}
const reconnect = setInterval(connect, 15000);
connect();

let shuttingDown = false;
function shutdown(signal, code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`Received ${signal}, shutting down...`);
    clearInterval(reconnect);
    for (const task of scheduledTasks) task.stop();
    // Stop only this worker. The WAHA session stays linked independently.
    control.close();
    webhooks.close(() => process.exit(code));
    setTimeout(() => process.exit(code), 5000).unref();
}
for (const server of [control, webhooks]) {
    server.on('error', error => {
        log.error('HTTP server failed:', error.message);
        shutdown('server_error', 1);
    });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
log.info(`Verbier bot using WAHA (${CONFIG.wahaSession})`);
log.info(
    `Scheduled: 08:00 & 12:00 (${CONFIG.timezone}); subscribed chats: ${chatManager.getAll().length}`,
);
