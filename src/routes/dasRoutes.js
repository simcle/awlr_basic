import { getAllDas, createDas, updateDas, deleteDas } from "../controllers/DasController.js";

export default async function (fastify, opts) {
    fastify.addHook('preHandler', fastify.verifyJwt)
    fastify.get('/das', getAllDas)
    fastify.post('/das', createDas)
    fastify.put('/das/:id', updateDas)
    fastify.delete('/das/:id', deleteDas)
}