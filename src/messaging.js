/* global window */
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;

/** Read the chat identity without triggering a full group participant refresh. */
export async function getChatSummary(client, chatId) {
    return client.pupPage.evaluate(async id => {
        const chat = await window.WWebJS.getChat(id, { getAsModel: false });
        if (!chat) throw new Error('Chat not found');
        return {
            id: chat.id._serialized,
            name: chat.name || chat.formattedTitle || chat.id._serialized,
            isGroup: chat.id._serialized.endsWith('@g.us'),
        };
    }, chatId);
}

export async function sendImage(client, chatId, image, caption) {
    const media = new MessageMedia('image/jpeg', image.toString('base64'), 'verbier.jpg');
    // getChatById refreshes group metadata, which can hang after device linking.
    // Sending directly to the known ID does not need that extra network request.
    const message = await client.sendMessage(chatId, media, {
        caption,
        sendSeen: false,
        waitUntilMsgSent: true,
    });
    if (!message) throw new Error('WhatsApp did not return a sent message');
    return message;
}
