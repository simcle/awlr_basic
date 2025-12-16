import { webhookTelegram } from "../controllers/TelegramBotController.js";

export default async function (fastify, opts) {
    fastify.post('/telegram/webhook', webhookTelegram)
}