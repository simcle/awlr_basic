import multipart from '@fastify/multipart'
import { createPda, downloadPdaExcel, getDetailPda, getPda, updatePda } from "../controllers/PdaController.js";

export default async function (fastify, opts) {
    fastify.register(multipart)
    fastify.addHook('preHandler', fastify.verifyJwt)
    fastify.post('/pda', createPda)
    fastify.get('/pda', getPda)
    fastify.get('/pda/download', downloadPdaExcel)
    fastify.get('/pda/detail/:id', getDetailPda)
    fastify.put('/pda/:id', updatePda)
}