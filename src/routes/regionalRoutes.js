import { getCities, getDistricts, getProvinces, getVillages } from '../controllers/RegionalController.js'

export default async function (fastify, opts) {
    fastify.addHook('preHandler', fastify.verifyJwt)
    fastify.get('/regional/provinces', getProvinces)
    fastify.get('/regional/cities/:provinceId', getCities)
    fastify.get('/regional/districts/:cityId', getDistricts)
    fastify.get('/regional/villages/:districtId', getVillages)
}