import { CONFIG } from './config.js';
import { createVerbierDateTime, getVerbierNow } from './utils.js';

/**
 * Fetches an image from Teleport.io.
 * @param {string|null} frametime - ISO 8601 timestamp (e.g., "2025-11-27T12:00:00Z")
 */
async function fetchImage(frametime = null) {
    // Build URL manually to avoid URL-encoding the frametime colons
    let url = `${CONFIG.teleportApi}/frame-get?feedid=${CONFIG.feedId}&sizecode=x768`;
    if (frametime) url += `&frametime=${frametime}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
        if (response.status === 404 && frametime) {
            throw new Error('Historical footage not available for this time');
        }
        throw new Error(`Teleport API error: ${response.status}`);
    }
    return readImage(response);
}

async function readImage(response) {
    const image = Buffer.from(await response.arrayBuffer());
    if (image.length < 3 || image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
        throw new Error('Webcam returned an invalid JPEG image');
    }
    return image;
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

    // Convert to ISO 8601 format for Teleport API
    const frametime = target.toISOString().replace(/\.\d{3}Z$/, 'Z');
    return fetchImage(frametime);
}
