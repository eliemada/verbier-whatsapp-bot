import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMessage } from '../src/commands.js';
import { getCurrentImage, getWebcamImage } from '../src/webcams.js';
import { getWeather } from '../src/weather.js';

vi.mock('../src/webcams.js', async importOriginal => ({
    ...(await importOriginal()),
    getCurrentImage: vi.fn(),
    getWebcamImage: vi.fn(),
}));
vi.mock('../src/weather.js', async importOriginal => ({
    ...(await importOriginal()),
    getWeather: vi.fn(),
}));
const image = Buffer.from('photo');
const message = body => ({ body, from: '123@g.us', reply: vi.fn(), replyImage: vi.fn() });
beforeEach(() => {
    vi.clearAllMocks();
    getCurrentImage.mockResolvedValue(image);
    getWebcamImage.mockResolvedValue(image);
    getWeather.mockResolvedValue(null);
});

describe('webcam commands', () => {
    it('sends one combined image for !!', async () => {
        const msg = message('!!');
        await handleMessage(msg);
        expect(getCurrentImage).toHaveBeenCalledTimes(1);
        expect(msg.replyImage).toHaveBeenCalledExactlyOnceWith(image, 'Webcam views from Verbier');
    });

    it('selects a named camera and includes its source', async () => {
        const msg = message('!verbier camera attelas');
        await handleMessage(msg);
        expect(getWebcamImage).toHaveBeenCalledExactlyOnceWith('attelas');
        expect(msg.replyImage).toHaveBeenCalledWith(
            image,
            expect.stringContaining('https://verbier.roundshot.com/les-attelas/'),
            'verbier_attelas.jpg',
        );
    });

    it('lists the camera commands without downloading or sending photos', async () => {
        const msg = message('!snow cameras');
        await handleMessage(msg);
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('!snow camera village'));
        expect(getWebcamImage).not.toHaveBeenCalled();
        expect(msg.replyImage).not.toHaveBeenCalled();
    });

    it('explains an unknown camera without fetching an unintended URL', async () => {
        const msg = message('!snow camera unknown');
        await handleMessage(msg);
        expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining('Unknown camera'));
        expect(getWebcamImage).not.toHaveBeenCalled();
    });
});
