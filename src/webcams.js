import sharp from 'sharp';
import { CONFIG } from './config.js';
import { log } from './logger.js';

export const WEBCAMS = Object.freeze([
    {
        id: 'carrefour',
        name: 'Le Carrefour',
        credit: 'Le Carrefour / Roundshot',
        pageUrl: 'https://lecarrefour.roundshot.com/',
        imageUrl: 'https://lecarrefour.roundshot.com/cams/50',
    },
    {
        id: 'attelas',
        name: 'Les Attelas',
        credit: 'Verbier 4Vallées / Roundshot',
        pageUrl: 'https://verbier.roundshot.com/les-attelas/',
        imageUrl: 'https://verbier.roundshot.com/cams/1473',
    },
    {
        id: 'savoleyres',
        name: 'Savoleyres',
        credit: 'Verbier 4Vallées / Roundshot',
        pageUrl: 'https://verbier.roundshot.com/savoleyres/',
        imageUrl: 'https://verbier.roundshot.com/cams/1022',
    },
    {
        id: 'village',
        name: 'Village - Hôtel W / Médran',
        credit: 'W Verbier / Skaping',
        pageUrl: 'https://www.skaping.com/verbier/hotel-w',
    },
]);

const WIDTH = 1600;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const xml = value =>
    String(value).replace(/[&<>"']/g, character => {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character];
    });

async function download(url, fetchImpl, signal) {
    const response = await fetchImpl(url, { signal });
    if (!response.ok) throw new Error(`Webcam request failed: ${response.status}`);
    if (Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES) {
        throw new Error('Webcam response is too large');
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES) throw new Error('Webcam response is too large');
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/** Skaping publishes the latest dated photo in the public page's Open Graph metadata. */
function villageImageUrl(html) {
    const tag = html
        .match(/<meta\b[^>]*>/gi)
        ?.find(value => /\bproperty\s*=\s*["']og:image["']/i.test(value));
    const value = tag?.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!value) throw new Error('Village webcam has no current image');
    const url = new URL(value.replaceAll('&amp;', '&'));
    // Only follow this camera's public media location, never arbitrary metadata URLs.
    if (
        url.protocol !== 'https:' ||
        url.hostname !== 'skaping.s3.gra.io.cloud.ovh.net' ||
        !url.pathname.startsWith('/verbier/hotel-w/') ||
        !url.pathname.endsWith('.jpg')
    ) {
        throw new Error('Village webcam returned an unexpected image location');
    }
    return url.href;
}

export async function getWebcamImage(id, { fetchImpl = fetch } = {}) {
    const camera = WEBCAMS.find(item => item.id === id);
    if (!camera) throw new Error('Unknown webcam');
    const signal = AbortSignal.timeout(20000);
    const url =
        camera.imageUrl ??
        villageImageUrl((await download(camera.pageUrl, fetchImpl, signal)).toString('utf8'));
    const image = await download(url, fetchImpl, signal);
    if (image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
        throw new Error('Webcam returned an invalid JPEG image');
    }
    // Decode the complete image, preserve its framing and bound memory/output size.
    return sharp(image, { limitInputPixels: 80000000 })
        .rotate()
        .resize({ width: WIDTH, height: 800, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer();
}

function banner(title, subtitle, height = 90) {
    return Buffer.from(`<svg width="${WIDTH}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#132b38"/>
        <text x="28" y="38" font-family="DejaVu Sans,sans-serif" font-size="30" font-weight="bold" fill="white">${xml(title)}</text>
        <text x="28" y="69" font-family="DejaVu Sans,sans-serif" font-size="20" fill="#c4d5df">${xml(subtitle)}</text>
    </svg>`);
}

/** One photo per report, retaining each camera's full view and source credit. */
export async function renderWebcams(frames, now = new Date()) {
    if (!frames.some(frame => frame.image)) throw new Error('No webcams are currently available');
    const date = now.toLocaleString('en-GB', {
        timeZone: CONFIG.timezone,
        dateStyle: 'medium',
        timeStyle: 'short',
    });
    const overlays = [
        { input: banner('Verbier - webcam report', `${date} / Swiss time`), top: 0, left: 0 },
    ];
    let top = 90;
    for (const { camera, image } of frames) {
        overlays.push({ input: banner(camera.name, camera.credit), top, left: 0 });
        top += 90;
        if (image) {
            const { width, height } = await sharp(image).metadata();
            overlays.push({ input: image, top, left: Math.floor((WIDTH - width) / 2) });
            top += height;
        } else {
            overlays.push({
                input: banner('Temporarily unavailable', 'Please check again later.', 120),
                top,
                left: 0,
            });
            top += 120;
        }
        top += 12;
    }
    return sharp({ create: { width: WIDTH, height: top, channels: 3, background: '#0b1921' } })
        .composite(overlays)
        .jpeg({ quality: 88 })
        .toBuffer();
}

export async function getCurrentImage({ fetchImpl = fetch, now = new Date() } = {}) {
    const frames = await Promise.all(
        WEBCAMS.map(async camera => {
            try {
                return { camera, image: await getWebcamImage(camera.id, { fetchImpl }) };
            } catch (error) {
                log.error(`Webcam unavailable (${camera.name}):`, error.message);
                return { camera, image: null };
            }
        }),
    );
    return renderWebcams(frames, now);
}
