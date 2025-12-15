import { loginUser, getMe, updateUser } from '../controllers/userController.js'

export default function async (fastify, opts) {
    fastify.post('/login', loginUser)

    fastify.get('/me', {
        preHandler: fastify.verifyJwt,
        handler: getMe
    })
    fastify.put('/update', {
        preHandler: fastify.verifyJwt,
        handler: updateUser
    })
}