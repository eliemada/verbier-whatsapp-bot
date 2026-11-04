import { beforeAll, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { getCurrentImage, getWebcamImage, WEBCAMS } from '../src/webcams.js';

const villageImage =
    'https://skaping.s3.gra.io.cloud.ovh.net/verbier/hotel-w/2026/11/04/large/06-30.jpg';
const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
let photos;
beforeAll(async () => {
    photos = await Promise.all(
        colors.map(background =>
            sharp({ create: { width: 320, height: 100, channels: 3, background } })
                .jpeg()
                .toBuffer(),
        ),
    );
});
function cameraFetch() {
    return vi.fn(async url => {
        if (url === WEBCAMS[3].pageUrl) {
            return new Response(`<meta content="${villageImage}" property="og:image">`);
        }
        const index =
            url === villageImage ? 3 : WEBCAMS.findIndex(camera => camera.imageUrl === url);
        if (index < 0) throw new Error('Unexpected URL');
        return new Response(photos[index], { headers: { 'Content-Type': 'image/jpeg' } });
    });
}

describe('multiple live webcams', () => {
    it('resolves the village camera to its latest dated photo', async () => {
        const fetchImpl = cameraFetch();
        const image = await getWebcamImage('village', { fetchImpl });
        expect(fetchImpl.mock.calls.map(call => call[0])).toEqual([
            WEBCAMS[3].pageUrl,
            villageImage,
        ]);
        expect((await sharp(image).metadata()).format).toBe('jpeg');
    });

    it('does not follow arbitrary URLs from camera page metadata', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValue(
                new Response('<meta property="og:image" content="http://127.0.0.1/private.jpg">'),
            );
        await expect(getWebcamImage('village', { fetchImpl })).rejects.toThrow('unexpected image');
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('renders all four views into one JPEG without mixing up their images', async () => {
        const fetchImpl = cameraFetch();
        const image = await getCurrentImage({ fetchImpl, now: new Date('2026-11-15T07:00:00Z') });
        const metadata = await sharp(image).metadata();
        expect(metadata.format).toBe('jpeg');
        expect(metadata.width).toBe(1600);
        const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
        const middle = Array.from({ length: info.height }, (_, row) => {
            const pixel = (row * info.width + info.width / 2) * info.channels;
            return [...data.subarray(pixel, pixel + 3)];
        });
        for (const expected of [
            [255, 0, 0],
            [0, 255, 0],
            [0, 0, 255],
            [255, 255, 0],
        ]) {
            expect(
                middle.some(actual =>
                    actual.every((channel, i) => Math.abs(channel - expected[i]) < 15),
                ),
            ).toBe(true);
        }
        expect(fetchImpl).toHaveBeenCalledTimes(5);
    });

    it('still creates a report when one camera returns a corrupt JPEG', async () => {
        const normal = cameraFetch();
        const fetchImpl = vi.fn(url =>
            url === WEBCAMS[1].imageUrl
                ? Promise.resolve(new Response(Buffer.from([0xff, 0xd8, 0xff])))
                : normal(url),
        );
        const image = await getCurrentImage({ fetchImpl });
        expect((await sharp(image).metadata()).format).toBe('jpeg');
        expect(normal).toHaveBeenCalledWith(WEBCAMS[2].imageUrl);
    });

    it('reports total camera failure instead of posting an empty report', async () => {
        const fetchImpl = vi.fn(async () => new Response('Unavailable', { status: 503 }));
        await expect(getCurrentImage({ fetchImpl })).rejects.toThrow('No webcams');
    });

    it('rejects HTML and unknown camera IDs', async () => {
        const fetchImpl = vi.fn(async () => new Response('<html>error</html>'));
        await expect(getWebcamImage('attelas', { fetchImpl })).rejects.toThrow('invalid JPEG');
        await expect(getWebcamImage('unknown', { fetchImpl })).rejects.toThrow('Unknown webcam');
    });
});
