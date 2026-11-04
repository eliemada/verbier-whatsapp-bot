import { afterEach, describe, expect, it, vi } from 'vitest';
import { getImageAt } from '../src/teleport.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
afterEach(() => vi.unstubAllGlobals());

describe('historical webcam fetching', () => {
    it('requests the selected Swiss time from the archive', async () => {
        const fetch = vi.fn().mockResolvedValue(new Response(jpeg));
        vi.stubGlobal('fetch', fetch);
        expect(await getImageAt(12, 0, '2026-11-03')).toEqual(jpeg);
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('frametime=2026-11-03T11:00:00Z'),
            { signal: expect.any(AbortSignal) },
        );
    });

    it('rejects non-image responses instead of sending an HTML error as a photo', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Error</html>')));
        await expect(getImageAt(12, 0, '2026-11-03')).rejects.toThrow('invalid JPEG');
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
