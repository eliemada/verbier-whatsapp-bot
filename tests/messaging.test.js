import { afterEach, describe, expect, it, vi } from 'vitest';
import { getChatSummary, sendImage } from '../src/messaging.js';

afterEach(() => vi.unstubAllGlobals());

describe('WhatsApp group messaging', () => {
    it('sends directly without waiting for the group participant refresh', async () => {
        const receipt = { id: { _serialized: 'message-1' }, ack: 1 };
        const client = {
            getChatById: vi.fn(() => {
                throw new Error('Group metadata is unavailable');
            }),
            sendMessage: vi.fn().mockResolvedValue(receipt),
        };
        const result = await sendImage(client, '123@g.us', Buffer.from('photo'), 'Test caption');
        expect(result).toBe(receipt);
        expect(client.getChatById).not.toHaveBeenCalled();
        expect(client.sendMessage).toHaveBeenCalledExactlyOnceWith(
            '123@g.us',
            expect.objectContaining({ mimetype: 'image/jpeg', data: 'cGhvdG8=' }),
            { caption: 'Test caption', sendSeen: false, waitUntilMsgSent: true },
        );
    });

    it('fails if WhatsApp returns no message receipt', async () => {
        const client = { sendMessage: vi.fn().mockResolvedValue(undefined) };
        await expect(sendImage(client, '123@g.us', Buffer.from('photo'), 'Test')).rejects.toThrow(
            'did not return a sent message',
        );
    });

    it('verifies the recipient without serializing full group metadata', async () => {
        const getChat = vi.fn().mockResolvedValue({
            id: { _serialized: '123@g.us' },
            name: 'Verbier Snow Report',
        });
        vi.stubGlobal('window', { WWebJS: { getChat } });
        const client = { pupPage: { evaluate: (fn, id) => fn(id) } };
        expect(await getChatSummary(client, '123@g.us')).toEqual({
            id: '123@g.us',
            name: 'Verbier Snow Report',
            isGroup: true,
        });
        expect(getChat).toHaveBeenCalledWith('123@g.us', { getAsModel: false });
    });
});
