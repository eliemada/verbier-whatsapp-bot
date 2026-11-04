import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../src/config.js';
import { getCurrentImage, getImageAt } from '../src/teleport.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
afterEach(() => vi.unstubAllGlobals());

describe('webcam fetching', () => {
    it('uses the primary image when it is available', async () => {
        const fetch = vi.fn().mockResolvedValue(new Response(jpeg));
        vi.stubGlobal('fetch', fetch);
        expect(await getCurrentImage()).toEqual(jpeg);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('falls back to the live Verbier camera when the original feed is archived', async () => {
        const fetch = vi
            .fn()
            .mockResolvedValueOnce(new Response('No frame payloads', { status: 404 }))
            .mockResolvedValueOnce(new Response(jpeg));
        vi.stubGlobal('fetch', fetch);
        expect(await getCurrentImage()).toEqual(jpeg);
        expect(fetch).toHaveBeenLastCalledWith(CONFIG.webcamFallbackUrl, {
            signal: expect.any(AbortSignal),
        });
    });

    it('falls back after a primary network timeout', async () => {
        const fetch = vi
            .fn()
            .mockRejectedValueOnce(new Error('Timeout'))
            .mockResolvedValueOnce(new Response(jpeg));
        vi.stubGlobal('fetch', fetch);
        expect(await getCurrentImage()).toEqual(jpeg);
    });

    it('rejects non-image responses instead of sending an HTML error as a photo', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation(() => new Response('<html>Error</html>')),
        );
        await expect(getCurrentImage()).rejects.toThrow('invalid JPEG');
    });

    it('reports an unavailable historical frame without substituting a current photo', async () => {
        const fetch = vi.fn().mockResolvedValue(new Response('Not found', { status: 404 }));
        vi.stubGlobal('fetch', fetch);
        await expect(getImageAt(12, 0, '2026-11-03')).rejects.toThrow(
            'Historical footage not available',
        );
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
