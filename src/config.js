import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import 'dotenv/config';

// Use data dir if exists (Docker), otherwise current dir
const DATA_DIR = process.env.DATA_DIR || '.';
const CHATS_FILE = `${DATA_DIR}/.chats.json`;

export const CONFIG = Object.freeze({
    dataDir: DATA_DIR,
    startAt: process.env.BOT_START_AT || '',
    controlPort: Number(process.env.CONTROL_PORT || 3000),
    webhookPort: Number(process.env.WEBHOOK_PORT || 3001),
    webhookUrl: process.env.WEBHOOK_URL || 'http://verbier-bot:3001/webhooks/waha',
    webhookSecret: process.env.WEBHOOK_SECRET || '',
    wahaUrl: process.env.WAHA_URL || 'http://waha:3000',
    wahaApiKey: process.env.WAHA_API_KEY || '',
    wahaSession: process.env.WAHA_SESSION || 'default',
    feedId: 'fe5nsqhtejqi',
    teleportApi: 'https://www.teleport.io/api/v2',
    webcamFallbackUrl: 'https://lecarrefour.roundshot.com/cams/50',
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

/**
 * Load chat IDs from file.
 */
function loadChatIds() {
    if (existsSync(CHATS_FILE)) {
        try {
            const data = JSON.parse(readFileSync(CHATS_FILE, 'utf-8'));
            return data.chatIds ?? [];
        } catch {
            return [];
        }
    }
    return [];
}

function saveChatIds(chatIds) {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(`${CHATS_FILE}.tmp`, JSON.stringify({ chatIds }, null, 2));
    renameSync(`${CHATS_FILE}.tmp`, CHATS_FILE);
}

// Mutable chat IDs list
const chatIds = loadChatIds();

export const chatManager = {
    getAll: () => [...chatIds],

    add: chatId => {
        if (!chatIds.includes(chatId)) {
            chatIds.push(chatId);
            saveChatIds(chatIds);
            return true;
        }
        return false;
    },

    remove: chatId => {
        const index = chatIds.indexOf(chatId);
        if (index > -1) {
            chatIds.splice(index, 1);
            saveChatIds(chatIds);
            return true;
        }
        return false;
    },

    has: chatId => chatIds.includes(chatId),
};
