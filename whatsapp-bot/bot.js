/**
 * Verbier WhatsApp Bot
 *
 * Sends daily snow images from Verbier webcam at 8 AM and 12 PM.
 * Also responds to commands for on-demand images.
 *
 * Prerequisites:
 * 1. Start the Python API: uv run uvicorn server:app --port 3001
 * 2. Run this bot: npm start
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');

// Configuration
const API_URL = 'http://localhost:3001';
const GROUP_NAME = 'Verbier Snow Updates'; // Change to your group name

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox'],
    }
});

// QR Code for login
client.on('qr', (qr) => {
    console.log('Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp bot is ready!');
    setupScheduledMessages();
});

client.on('authenticated', () => {
    console.log('Authenticated successfully');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg);
});

// =============================================================================
// Image Fetching
// =============================================================================

async function fetchImage(endpoint) {
    const response = await fetch(`${API_URL}${endpoint}`);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
}

async function getCurrentImage() {
    return fetchImage('/image/current');
}

async function get8AMImage(date = null) {
    const url = date ? `/image/8am?date=${date}` : '/image/8am';
    return fetchImage(url);
}

async function getNoonImage(date = null) {
    const url = date ? `/image/noon?date=${date}` : '/image/noon';
    return fetchImage(url);
}

async function getImageAtTime(hour, minute = 0, date = null) {
    let url = `/image/at?hour=${hour}&minute=${minute}`;
    if (date) url += `&date=${date}`;
    return fetchImage(url);
}

// =============================================================================
// Sending Messages
// =============================================================================

async function sendImageToGroup(groupName, imageBuffer, caption) {
    const chats = await client.getChats();
    const group = chats.find(chat => chat.isGroup && chat.name === groupName);

    if (!group) {
        console.error(`Group "${groupName}" not found`);
        return false;
    }

    const media = new MessageMedia('image/jpeg', imageBuffer.toString('base64'), 'verbier.jpg');
    await group.sendMessage(media, { caption });
    console.log(`Sent image to ${groupName}: ${caption}`);
    return true;
}

async function sendMorningUpdate() {
    try {
        const image = await get8AMImage();
        const date = new Date().toLocaleDateString('en-CH');
        await sendImageToGroup(GROUP_NAME, image, `Good morning! Verbier at 8 AM - ${date}`);
    } catch (error) {
        console.error('Failed to send morning update:', error);
    }
}

async function sendNoonUpdate() {
    try {
        const image = await getNoonImage();
        const date = new Date().toLocaleDateString('en-CH');
        await sendImageToGroup(GROUP_NAME, image, `Noon update from Verbier! - ${date}`);
    } catch (error) {
        console.error('Failed to send noon update:', error);
    }
}

// =============================================================================
// Scheduled Messages
// =============================================================================

function setupScheduledMessages() {
    // 8 AM CET (7 AM UTC in winter, 6 AM UTC in summer)
    // Using 7 AM UTC for simplicity - adjust as needed
    cron.schedule('0 7 * * *', () => {
        console.log('Sending 8 AM update...');
        sendMorningUpdate();
    }, { timezone: 'Europe/Zurich' });

    // 12 PM CET
    cron.schedule('0 12 * * *', () => {
        console.log('Sending noon update...');
        sendNoonUpdate();
    }, { timezone: 'Europe/Zurich' });

    console.log('Scheduled messages set up:');
    console.log('  - 8:00 AM CET: Morning update');
    console.log('  - 12:00 PM CET: Noon update');
}

// =============================================================================
// Command Handler
// =============================================================================

client.on('message', async (msg) => {
    const body = msg.body.toLowerCase().trim();

    // !snow - current image
    if (body === '!snow' || body === '!verbier') {
        try {
            const image = await getCurrentImage();
            const media = new MessageMedia('image/jpeg', image.toString('base64'), 'verbier_now.jpg');
            await msg.reply(media, null, { caption: 'Current view from Verbier' });
        } catch (error) {
            await msg.reply('Sorry, failed to fetch the image. Is the API running?');
        }
    }

    // !snow 8am - today's 8 AM image
    else if (body === '!snow 8am' || body === '!verbier 8am') {
        try {
            const image = await get8AMImage();
            const media = new MessageMedia('image/jpeg', image.toString('base64'), 'verbier_8am.jpg');
            await msg.reply(media, null, { caption: 'Verbier at 8 AM today' });
        } catch (error) {
            await msg.reply('Sorry, failed to fetch the 8 AM image.');
        }
    }

    // !snow noon - today's noon image
    else if (body === '!snow noon' || body === '!verbier noon') {
        try {
            const image = await getNoonImage();
            const media = new MessageMedia('image/jpeg', image.toString('base64'), 'verbier_noon.jpg');
            await msg.reply(media, null, { caption: 'Verbier at noon today' });
        } catch (error) {
            await msg.reply('Sorry, failed to fetch the noon image.');
        }
    }

    // !snow history 2025-11-20 - image from specific date at noon
    else if (body.startsWith('!snow history ') || body.startsWith('!verbier history ')) {
        const parts = body.split(' ');
        const date = parts[2]; // YYYY-MM-DD

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            await msg.reply('Usage: !snow history YYYY-MM-DD\nExample: !snow history 2025-11-20');
            return;
        }

        try {
            const image = await getNoonImage(date);
            const media = new MessageMedia('image/jpeg', image.toString('base64'), `verbier_${date}.jpg`);
            await msg.reply(media, null, { caption: `Verbier on ${date} at noon` });
        } catch (error) {
            await msg.reply(`Sorry, no image available for ${date}`);
        }
    }

    // !snow help
    else if (body === '!snow help' || body === '!verbier help') {
        await msg.reply(
            '*Verbier Snow Bot Commands*\n\n' +
            '!snow - Current live image\n' +
            '!snow 8am - Today\'s 8 AM image\n' +
            '!snow noon - Today\'s noon image\n' +
            '!snow history YYYY-MM-DD - Image from a specific date\n' +
            '!snow help - Show this help'
        );
    }
});

// Start the client
console.log('Starting WhatsApp bot...');
client.initialize();
