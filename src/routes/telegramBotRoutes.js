import { createTelegramBot, deleteTelegramBot, getTelegramBot } from "../controllers/TelegramBotController.js";

export default async function(fastify, opts) {
    fastify.addHook('preHandler', fastify.verifyJwt)
    fastify.post('/telegram', createTelegramBot)
    fastify.get('/telegram', getTelegramBot)
    fastify.delete('/telegram', deleteTelegramBot)
}

