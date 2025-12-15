import {downloadReadingExcel, getDas, getPda, getReading, saveReading } from "../controllers/SensorReadingController.js";

export default function async(fastify, opts) {
    fastify.post('/sensor/:pdaId', saveReading)
    fastify.get('/sensor/das', {
        preHandler: fastify.verifyJwt,
        handler: getDas
    })
    fastify.get('/sensor/pda/:dasId', {
        preHandler: fastify.verifyJwt,
        handler: getPda
    })
    fastify.get('/sensor/data', {
        preHandler: fastify.verifyJwt,
        handler: getReading
    })
    fastify.get('/sensor/download', {
        preHandler: fastify.verifyJwt,
        handler: downloadReadingExcel
    })
}