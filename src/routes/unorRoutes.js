import multipart from '@fastify/multipart'
import { registerUnor, updateUnor } from "../controllers/unorController.js";

export default function async (fastify, opts) {
    fastify.register(multipart)
    fastify.post('/unor/register', registerUnor)
    fastify.put('/unor', {
        preHandler: fastify.verifyJwt,
        handler: updateUnor
    })
}