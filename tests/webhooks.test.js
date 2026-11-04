import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { once } from 'node:events';
import path from 'node:path';
import os from 'node:os';
import { createCommandHandler, createWebhookServer } from '../src/webhooks.js';

let directory;
let server;
let url;
let client;
let handleMessage;
let options;
const current = 1793769900000;
const event = overrides => ({
    event: 'message.any',
    session: 'default',
    payload: {
        id: 'message-1',
        body: '!!',
        timestamp: current / 1000,
        from: '123@g.us',
        to: '456@c.us',
        fromMe: false,
        source: 'app',
        ...overrides,
    },
});
beforeEach(async () => {
    directory = mkdtempSync(path.join(os.tmpdir(), 'verbier-webhooks-'));
    client = { sendText: vi.fn(), sendImage: vi.fn() };
    handleMessage = vi.fn();
    options = { client, session: 'default', dataDir: directory, handleMessage, now: () => current };
    server = createWebhookServer({ secret: 'secret', onEvent: createCommandHandler(options) });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    url = `http://127.0.0.1:${server.address().port}/webhooks/waha`;
});
afterEach(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    rmSync(directory, { recursive: true, force: true });
});
const deliver = (payload, key = 'secret') =>
    fetch(url, {
        method: 'POST',
        headers: { 'X-Webhook-Key': key },
        body: JSON.stringify(payload),
    });

describe('WAHA webhooks', () => {
    it('rejects unauthenticated requests without executing commands', async () => {
        expect((await deliver(event(), 'wrong')).status).toBe(401);
        expect(handleMessage).not.toHaveBeenCalled();
    });

    it('processes a repeated command only once, including after a worker restart', async () => {
        await deliver(event());
        await deliver(event());
        await createCommandHandler(options)(event());
        expect(handleMessage).toHaveBeenCalledTimes(1);
    });

    it('routes owner commands to the destination group and preserves reply IDs', async () => {
        handleMessage.mockImplementation(async message => {
            await message.reply('Status');
            await message.replyImage(Buffer.from('photo'), 'Caption');
        });
        await deliver(event({ fromMe: true, from: '456@c.us', to: '123@g.us' }));
        expect(handleMessage.mock.calls[0][0].from).toBe('123@g.us');
        expect(client.sendText).toHaveBeenCalledWith('123@g.us', 'Status', 'message-1');
        expect(client.sendImage).toHaveBeenCalledWith(
            '123@g.us',
            Buffer.from('photo'),
            'Caption',
            undefined,
            'message-1',
        );
    });

    it('ignores old history, API echoes, other sessions, and ordinary conversations', async () => {
        await deliver(event({ timestamp: current / 1000 - 3600 }));
        await deliver(event({ source: 'api' }));
        await deliver({ ...event(), session: 'different-session' });
        await deliver(event({ body: 'Hello!' }));
        expect(handleMessage).not.toHaveBeenCalled();
    });

    it('does not resend after an ambiguous command failure and webhook retry', async () => {
        handleMessage.mockRejectedValue(new Error('Network disconnected after upload'));
        expect((await deliver(event())).status).toBe(500);
        expect((await deliver(event())).status).toBe(200);
        expect(handleMessage).toHaveBeenCalledTimes(1);
    });
});
