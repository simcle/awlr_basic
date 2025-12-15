import dotenv from 'dotenv'
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from 'path'
import formBody from '@fastify/formbody'
import cors from '@fastify/cors'
import db from './src/plugins/db.js';
import jwtAuth from './src/plugins/jwtAuth.js';
import cron from 'node-cron';
import { checkSensorOffline } from './src/cron/checkSensorOffline.js';

import dashboardRoutes from './src/routes/dashboardRoutes.js';
import unorRoutes from './src/routes/unorRoutes.js'
import userRoutes from './src/routes/userRoutes.js'
import dasRoutes from './src/routes/dasRoutes.js';
import regionalRoutes from './src/routes/regionalRoutes.js';
import pdaRoutes from './src/routes/pdaRoutes.js';
import sensorRoutes from './src/routes/sensorRoutes.js'
import warningRoutes from './src/routes/WarningRoutes.js'
import statisticRoutes from './src/routes/statisticRoutes.js'
import notificationRoutes from './src/routes/NotificationRoutes.js';
// ===== SOCKET.IO IMPORTS =====
import socket from 'fastify-socket'

dotenv.config()

// ===========================================================
// FASTIFY INSTANCE
// ===========================================================
const fastify = Fastify({
    logger: false
})

// ===========================================================
// PLUGINS
// ===========================================================
await fastify.register(cors, {
    origin: '*',
    methods: ['GET','PUT','POST','DELETE','OPTIONS']
})
await fastify.register(socket, {
    cors: {origin: '*'}
})
fastify.addContentTypeParser('application/xml', { parseAs: 'string' }, function (req, body, done) {
  done(null, body)
})
fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), 'public'),
  prefix: '/',
})

await fastify.register(db)
await fastify.register(formBody)
await fastify.register(jwtAuth)

await fastify.register(dashboardRoutes, {prefix: '/api'})
await fastify.register(unorRoutes, {prefix: '/api'})
await fastify.register(userRoutes, {prefix: '/api/auth'})
await fastify.register(dasRoutes, {prefix: '/api'})
await fastify.register(regionalRoutes, {prefix: '/api'})
await fastify.register(pdaRoutes, {prefix: '/api'})
await fastify.register(sensorRoutes, {prefix: '/api'})
await fastify.register(warningRoutes, {prefix: '/api'})
await fastify.register(statisticRoutes, {prefix: '/api'})
await fastify.register(notificationRoutes, {prefix: '/api'})

fastify.ready((err) => {
    if(err) console.log(err)
    fastify.io.on('connect', (socket) => {
        console.log("Client connected:", socket.id);
        socket.on("join-unor", (unorId) => {
            socket.join(`unor_${unorId}`);
            console.log(`Socket ${socket.id} join room: unor_${unorId}`);
        });

    })
});

// ===========================================================
// CRON JOB
// ===========================================================
cron.schedule('* * * * *', () => checkSensorOffline(fastify.io));


// ===========================================================
// START SERVER (PAKAI httpServer.listen)
// ===========================================================

const PORT = process.env.PORT || 3000;

fastify.listen({port: process.env.PORT || 3000, host: '0.0.0.0'}, (err) => {
    if(err) {
        fastify.log.error(err)
        process.exit(1)
    }
})