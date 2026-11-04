import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import { once } from 'node:events';
import { WahaClient } from '../src/waha.js';

let server;
let client;
let requests;
let respond;
beforeEach(async () => {
    requests = [];
    respond = () => ({ status: 200, body: {} });
    server = http.createServer(async (request, response) => {
        let body = '';
        for await (const chunk of request) body += chunk;
        const captured = {
            path: request.url,
            method: request.method,
            key: request.headers['x-api-key'],
            body: body ? JSON.parse(body) : null,
        };
        requests.push(captured);
        const result = respond(captured);
        response.writeHead(result.status, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(result.body));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    client = new WahaClient({
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        apiKey: 'test-secret',
    });
});
afterEach(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
});

const config = {
    webhooks: [
        {
            url: 'http://bot/webhooks/waha',
            events: ['message.any'],
            customHeaders: [{ name: 'X-Webhook-Key', value: 'webhook-secret' }],
        },
    ],
};

describe('WAHA integration', () => {
    it('sends the JPEG and caption to exactly the requested group with API authentication', async () => {
        respond = () => ({ status: 201, body: { id: 'true_123@g.us_MESSAGE', ack: 1 } });
        expect(await client.sendImage('123@g.us', Buffer.from('jpeg'), 'Weather')).toEqual({
            id: 'true_123@g.us_MESSAGE',
            ack: 1,
        });
        expect(requests).toEqual([
            {
                path: '/api/sendImage',
                method: 'POST',
                key: 'test-secret',
                body: {
                    session: 'default',
                    chatId: '123@g.us',
                    caption: 'Weather',
                    file: { mimetype: 'image/jpeg', filename: 'verbier.jpg', data: 'anBlZw==' },
                },
            },
        ]);
    });

    it('does not retry a failed send or include upstream secrets in errors', async () => {
        respond = () => ({ status: 500, body: { secret: 'sensitive-value' } });
        await expect(client.sendText('123@g.us', 'Test')).rejects.toThrow(
            'WAHA POST /api/sendText failed: 500',
        );
        expect(requests).toHaveLength(1);
    });

    it('does not claim success when the gateway returns no message ID', async () => {
        await expect(client.sendImage('123@g.us', Buffer.from('jpeg'), 'Weather')).rejects.toThrow(
            'verify before retrying',
        );
    });

    it('creates a missing session with durable webhook configuration', async () => {
        respond = request =>
            request.method === 'GET'
                ? { status: 404, body: {} }
                : { status: 201, body: { status: 'STARTING' } };
        await client.ensureSession(config);
        expect(requests[1].body).toEqual({ name: 'default', start: true, config });
    });

    it('leaves an already linked and configured session running on bot restart', async () => {
        respond = () => ({ status: 200, body: { status: 'WORKING', config } });
        await client.ensureSession(config);
        expect(requests).toHaveLength(1);
        expect(requests[0].method).toBe('GET');
    });

    it('restarts a stopped session without logging out or deleting authentication', async () => {
        respond = () => ({ status: 200, body: { status: 'STOPPED', config } });
        await client.ensureSession(config);
        expect(requests.map(request => request.path)).toEqual([
            '/api/sessions/default',
            '/api/sessions/default/start',
        ]);
    });

    it('reports pairing as unhealthy and WORKING as ready', async () => {
        respond = () => ({ status: 200, body: { status: 'SCAN_QR_CODE' } });
        expect(await client.getStatus()).toMatchObject({ ready: false, pairingRequired: true });
        respond = () => ({ status: 200, body: { status: 'WORKING' } });
        expect(await client.getStatus()).toMatchObject({ ready: true, pairingRequired: false });
    });

    it('checks the exact message receipt without downloading media', async () => {
        respond = () => ({
            status: 200,
            body: { id: 'true_123@g.us_MESSAGE', ack: 2, ackName: 'DEVICE' },
        });
        expect(await client.getDelivery('true_123@g.us_MESSAGE')).toMatchObject({ ack: 2 });
        expect(requests[0].path).toBe(
            '/api/default/chats/123%40g.us/messages/true_123%40g.us_MESSAGE?downloadMedia=false',
        );
    });
});
