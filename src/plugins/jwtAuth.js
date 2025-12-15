import fp from 'fastify-plugin'
import jwt from 'jsonwebtoken'

export default fp(async (fastify, opts) => {
    fastify.decorate('verifyJwt', async (req, res) => {
        const authHeader = req.headers['authorization']
        if(!authHeader) {
            return res.code(401).send({
                success: false,
                message: 'Unauthorized: No token'
            });
        }

        const token = authHeader.split(' ')[1]
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            req.user = decoded 
        } catch (error) {
            return res.code(401).send({
                success: false,
                message: 'Unauthorized: Invalid token'
            });
        }
    })
})