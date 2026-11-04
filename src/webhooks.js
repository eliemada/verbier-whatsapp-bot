import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { log } from './logger.js';

/** Persist command IDs before processing so webhook redelivery cannot send twice. */
export function createCommandHandler({ client, session, dataDir, handleMessage, now = Date.now }) {
    const file = path.join(dataDir, '.handled-messages.json');
    const seen = new Set(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []);
    return async event => {
        if (event.session !== session) return;
        if (event.event === 'session.status') {
            log.info(`WAHA session: ${event.payload?.status}`);
            return;
        }
        if (event.event.startsWith('message.ack')) {
            log.info(`WAHA acknowledgement: ${event.payload?.id} (${event.payload?.ack})`);
            return;
        }
        const message = event.payload;
        if (event.event !== 'message.any' || !message?.id || typeof message.body !== 'string') {
            return;
        }
        if (
            message.source === 'api' ||
            !/^(!!|!(?:snow|verbier)(?:\s|$))/i.test(message.body.trim())
        ) {
            return;
        }
        // Never respond to old commands imported during initial WhatsApp history sync.
        if (!Number.isFinite(message.timestamp) || now() / 1000 - message.timestamp > 300) return;
        const chatId = message.fromMe ? message.to : message.from;
        if (!/^[\d-]+@(g|c)\.us$/.test(chatId ?? '') || seen.has(message.id)) return;
        seen.add(message.id);
        while (seen.size > 2000) seen.delete(seen.values().next().value);
        mkdirSync(dataDir, { recursive: true });
        writeFileSync(`${file}.tmp`, JSON.stringify([...seen]), { mode: 0o600 });
        renameSync(`${file}.tmp`, file);
        await handleMessage({
            body: message.body,
            from: chatId,
            reply: text => client.sendText(chatId, text, message.id),
            replyImage: (image, caption, filename) =>
                client.sendImage(chatId, image, caption, filename, message.id),
        });
    };
}

export function createWebhookServer({ secret, onEvent }) {
    if (!secret) throw new Error('WEBHOOK_SECRET is required');
    return http.createServer(async (request, response) => {
        const reply = (status, message) => {
            response.writeHead(status, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ message }));
        };
        if (request.method !== 'POST' || request.url !== '/webhooks/waha') {
            return reply(404, 'Not found');
        }
        const provided = Buffer.from(request.headers['x-webhook-key'] ?? '');
        const expected = Buffer.from(secret);
        if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
            return reply(401, 'Unauthorized');
        }
        let raw = '';
        try {
            for await (const chunk of request) {
                raw += chunk;
                if (raw.length > 1024 * 1024) return reply(413, 'Payload too large');
            }
            let event;
            try {
                event = JSON.parse(raw);
            } catch {
                return reply(400, 'Invalid JSON');
            }
            if (!event || typeof event.event !== 'string') return reply(400, 'Invalid event');
            await onEvent(event);
            reply(200, 'OK');
        } catch (error) {
            log.error('Webhook processing failed:', error.message);
            reply(500, 'Processing failed');
        }
    });
}
