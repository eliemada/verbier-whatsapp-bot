import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { once } from 'node:events';
import { createControlServer } from '../src/control.js';

let server;
let baseUrl;
let callbacks;
beforeEach(async () => {
    callbacks = {
        getStatus: vi.fn().mockResolvedValue({ ready: true, state: 'CONNECTED' }),
        getQr: vi.fn().mockReturnValue(null),
        getChat: vi.fn(),
        sendUpdate: vi.fn().mockResolvedValue({ id: 'sent-message', ack: 1 }),
        getDelivery: vi.fn().mockResolvedValue({ id: 'sent-message', ack: 2 }),
    };
    server = createControlServer(callbacks);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterEach(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
});

describe('operator control', () => {
    it('stays healthy while paused but refuses an operator send', async () => {
        callbacks.getStatus.mockResolvedValue({
            ready: true,
            active: false,
            startsAt: '2026-11-15T07:00:00.000Z',
        });
        expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
        const response = await fetch(`${baseUrl}/send`, {
            method: 'POST',
            body: JSON.stringify({ chatId: '12345@g.us' }),
        });
        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
            error: 'Bot is paused',
            startsAt: '2026-11-15T07:00:00.000Z',
        });
        expect(callbacks.sendUpdate).not.toHaveBeenCalled();
    });

    it('marks an unpaired client unhealthy and refuses to send', async () => {
        callbacks.getStatus.mockResolvedValue({ ready: false, pairingRequired: true });
        expect((await fetch(`${baseUrl}/health`)).status).toBe(503);
        expect((await fetch(`${baseUrl}/send`, { method: 'POST' })).status).toBe(503);
        expect(callbacks.sendUpdate).not.toHaveBeenCalled();
    });

    it('sends exactly once to the explicitly requested group and returns a receipt', async () => {
        const response = await fetch(`${baseUrl}/send`, {
            method: 'POST',
            body: JSON.stringify({ chatId: '12345@g.us', title: 'Test' }),
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ id: 'sent-message', ack: 1 });
        expect(callbacks.sendUpdate).toHaveBeenCalledExactlyOnceWith('12345@g.us', 'Test');
    });

    it.each(['invalid-json', 'null', '{}', '{"chatId":"all"}'])(
        'rejects an invalid send request: %s',
        async body => {
            const response = await fetch(`${baseUrl}/send`, { method: 'POST', body });
            expect(response.status).toBe(400);
            expect(callbacks.sendUpdate).not.toHaveBeenCalled();
        },
    );

    it('reports delivery failure instead of claiming a successful send', async () => {
        callbacks.sendUpdate.mockRejectedValue(new Error('Upload failed'));
        const response = await fetch(`${baseUrl}/send`, {
            method: 'POST',
            body: JSON.stringify({ chatId: '12345@g.us' }),
        });
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Upload failed' });
    });

    it('checks the stored WhatsApp acknowledgement for a sent message', async () => {
        const response = await fetch(`${baseUrl}/delivery?id=sent-message`);
        expect(await response.json()).toEqual({ id: 'sent-message', ack: 2 });
        expect(callbacks.getDelivery).toHaveBeenCalledWith('sent-message');
    });
});
