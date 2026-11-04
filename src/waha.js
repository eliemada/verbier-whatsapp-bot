/** Small WAHA HTTP adapter; sending requests are never retried automatically. */
export class WahaClient {
    constructor({ baseUrl, apiKey, session = 'default', fetchImpl = fetch }) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
        this.session = session;
        this.fetch = fetchImpl;
    }

    async request(endpoint, { method = 'GET', body, timeout = 15000 } = {}) {
        const response = await this.fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: { 'X-Api-Key': this.apiKey, 'Content-Type': 'application/json' },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            signal: AbortSignal.timeout(timeout),
        });
        if (!response.ok) {
            // Do not log response bodies: session responses can include webhook credentials.
            const error = new Error(
                `WAHA ${method} ${endpoint.split('?')[0]} failed: ${response.status}`,
            );
            error.status = response.status;
            throw error;
        }
        if (response.status === 204) return null;
        return response.json();
    }

    sessionPath(suffix = '') {
        return `/api/sessions/${encodeURIComponent(this.session)}${suffix}`;
    }

    async ensureSession(config) {
        let current;
        try {
            current = await this.request(this.sessionPath());
        } catch (error) {
            if (error.status !== 404) throw error;
            return this.request('/api/sessions', {
                method: 'POST',
                body: { name: this.session, start: true, config },
            });
        }
        const desiredHook = config.webhooks[0];
        const existingHook = current.config?.webhooks?.find(hook => hook.url === desiredHook.url);
        const sameHeader = existingHook?.customHeaders?.some(
            header =>
                header.name === 'X-Webhook-Key' &&
                header.value === desiredHook.customHeaders[0].value,
        );
        const sameEvents = desiredHook.events.every(event => existingHook?.events?.includes(event));
        if (!sameHeader || !sameEvents) {
            current = await this.request(this.sessionPath(), {
                method: 'PUT',
                body: { config: { ...current.config, ...config } },
            });
        }
        if (current.status === 'STOPPED') {
            return this.request(this.sessionPath('/start'), { method: 'POST' });
        }
        return current;
    }

    async getStatus() {
        try {
            const session = await this.request(this.sessionPath(), { timeout: 5000 });
            return {
                ready: session.status === 'WORKING',
                state: session.status,
                engine: 'GOWS',
                pairingRequired: session.status === 'SCAN_QR_CODE',
            };
        } catch (error) {
            return { ready: false, state: 'UNAVAILABLE', engine: 'GOWS', error: error.message };
        }
    }

    async getQr() {
        if (!(await this.getStatus()).pairingRequired) return null;
        const result = await this.request(
            `/api/${encodeURIComponent(this.session)}/auth/qr?format=raw`,
        );
        return result.value;
    }

    async getChat(chatId) {
        if (!chatId?.endsWith('@g.us')) throw new Error('Expected a WhatsApp group ID');
        const group = await this.request(
            `/api/${encodeURIComponent(this.session)}/groups/${encodeURIComponent(chatId)}`,
        );
        return {
            id: chatId,
            name: group.subject ?? group.name ?? group.Name ?? chatId,
            isGroup: true,
        };
    }

    async sendText(chatId, text, replyTo) {
        return this.request('/api/sendText', {
            method: 'POST',
            timeout: 60000,
            body: {
                session: this.session,
                chatId,
                text,
                ...(replyTo ? { reply_to: replyTo } : {}),
            },
        });
    }

    async sendImage(chatId, image, caption, filename = 'verbier.jpg', replyTo) {
        const message = await this.request('/api/sendImage', {
            method: 'POST',
            timeout: 60000,
            body: {
                session: this.session,
                chatId,
                caption,
                file: { mimetype: 'image/jpeg', filename, data: image.toString('base64') },
                ...(replyTo ? { reply_to: replyTo } : {}),
            },
        });
        if (!message?.id) {
            throw new Error('WAHA did not return a message ID; verify before retrying');
        }
        return message;
    }

    async getDelivery(id) {
        const chatId = id?.split('_')[1];
        if (!chatId || !/^\d[\d-]*@(g|c)\.us$/.test(chatId)) throw new Error('Invalid message ID');
        const message = await this.request(
            `/api/${encodeURIComponent(this.session)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(id)}?downloadMedia=false`,
        );
        return { id: message.id, ack: message.ack, ackName: message.ackName };
    }
}
