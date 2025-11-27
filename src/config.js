import { readFileSync, writeFileSync, existsSync } from 'fs';

// Use data dir if exists (Docker), otherwise current dir
const DATA_DIR = process.env.DATA_DIR || '.';
const CHATS_FILE = `${DATA_DIR}/.chats.json`;

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
    writeFileSync(CHATS_FILE, JSON.stringify({ chatIds }, null, 2));
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
