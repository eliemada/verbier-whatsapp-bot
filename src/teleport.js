import { CONFIG } from './config.js';
import { createVerbierDateTime, getVerbierNow } from './utils.js';

/**
 * Fetches an image from Teleport.io.
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

export async function getCurrentImage() {
    return fetchImage();
}

/**
 * Gets image at a specific time.
 */
export async function getImageAt(hour, minute = 0, dateStr = null) {
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
