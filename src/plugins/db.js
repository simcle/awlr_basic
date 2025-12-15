import fp from 'fastify-plugin'
import mongoose from 'mongoose'

export default fp( async (fastify, opt) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        fastify.log.info('MongoDB connected')
    } catch (error) {
        fastify.log.error('MongoDB connection error:', err);
        process.exit(1);   
    }
})