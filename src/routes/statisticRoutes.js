import { getPda, getStatistics } from "../controllers/StatisticController.js";

export default function async(fastify, opts) {
    fastify.addHook('preHandler', fastify.verifyJwt)
    fastify.get('/statistics', getStatistics)
    fastify.get('/statistics/pda', getPda)
}