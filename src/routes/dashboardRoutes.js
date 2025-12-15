import { getAllPda } from "../controllers/DashboardController.js";

export default async function (fastify, opts) {
    fastify.addHook('preHandler', fastify.verifyJwt)
    fastify.get('/dashboard/pda', getAllPda)
}