import http from 'node:http';

/** Operator endpoints, reachable only inside the bot's own network namespace. */
export function createControlServer({ getStatus, getQr, getChat, sendUpdate, getDelivery }) {
    let sending = false;
    return http.createServer(async (request, response) => {
        const reply = (status, body) => {
            response.writeHead(status, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify(body));
        };
        try {
            const url = new URL(request.url, 'http://localhost');
            if (request.method === 'GET' && url.pathname === '/health') {
                const status = await getStatus();
                return reply(status.ready ? 200 : 503, status);
            }
            if (request.method === 'GET' && url.pathname === '/qr') {
                const qr = await getQr();
                return reply(qr ? 200 : 404, qr ? { qr } : { error: 'No pairing QR available' });
            }
            if (request.method === 'GET' && url.pathname === '/chat') {
                return reply(200, await getChat(url.searchParams.get('id')));
            }
            if (request.method === 'GET' && url.pathname === '/delivery') {
                return reply(200, await getDelivery(url.searchParams.get('id')));
            }
            if (request.method !== 'POST' || url.pathname !== '/send') {
                return reply(404, { error: 'Not found' });
            }
            const status = await getStatus();
            if (!status.ready) {
                return reply(503, { error: 'WhatsApp is not connected' });
            }
            if (status.active === false) {
                return reply(409, { error: 'Bot is paused', startsAt: status.startsAt });
            }
            let body = '';
            for await (const chunk of request) {
                body += chunk;
                if (body.length > 4096) return reply(413, { error: 'Request too large' });
            }
            let input;
            try {
                input = JSON.parse(body);
            } catch {
                return reply(400, { error: 'Invalid JSON' });
            }
            if (
                !input ||
                typeof input.chatId !== 'string' ||
                !/^[\d-]+@(g|c)\.us$/.test(input.chatId) ||
                (input.title !== undefined &&
                    (typeof input.title !== 'string' || input.title.length > 200))
            ) {
                return reply(400, { error: 'A valid chatId and optional title are required' });
            }
            if (sending) return reply(409, { error: 'A manual send is already in progress' });
            sending = true;
            try {
                return reply(200, await sendUpdate(input.chatId, input.title));
            } finally {
                sending = false;
            }
        } catch (error) {
            reply(500, { error: error.message });
        }
    });
}
