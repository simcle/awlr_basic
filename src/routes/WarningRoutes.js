import { downloadWarningExcel, getWarning } from "../controllers/WarningController.js";

export default function async(fastify, opts) {
    fastify.addHook('preHandler', fastify.verifyJwt)
    fastify.get('/warning', getWarning)
    fastify.get('/warning/download', downloadWarningExcel)
}