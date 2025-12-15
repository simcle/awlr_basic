import PdaModel from '../models/PdaModel.js'
import SensorReading from '../models/SensorReading.js'

export const getPda = async (req, res) => {
    try {
        const unorId = req.user.unorId
        const data = await PdaModel.find({unorId}).sort({name: 1}).select('_id, name')
        res.send({
            status: true,
            data: data
        })
    } catch (error) {
        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan pada server"
        });
    }
}

const normalizeStartEnd = (start, end, mode) => {
    const s = new Date(start)
    if(mode !== 'real-time') s.setHours(0, 0, 0, 0)
    const e = new Date(end)
    e.setHours(23, 59, 59, 999)
    return { s, e }
}

export const getStatistics = async (req, res) => {
    try {
        const {
            mode,
            start,
            end,
            pdaId,
        } = req.query

        if (!start || !end) {
            return res.code(400).send({
                status: false,
                message: "Parameter start dan end wajib diisi"
            });
        }
        const { s, e } = normalizeStartEnd(start, end, mode)
        const match = {
            pdaId,
            timestamp: {
                $gte: s,
                $lte: e
            }
        };
        const pipeline = [
            { $match: match },

            // urutkan data dari lama → kebaru

            { $sort: { timestamp: 1 } },
            {
                $project: {
                    _id: 1,
                    timestamp: 1,
                    level: 1,
                    velocity: 1,
                    flowrate: 1,
                    battery: 1,
                    warningStatus: 1
                }
            },
            

        ];
        const data = await SensorReading.aggregate(pipeline);
        const threshold = await PdaModel.findById(pdaId).select('threshold')
        return res.send({
            status: true,
            count: data.length,
            data,
            threshold: threshold.threshold
        });
    } catch (error) {
        console.log(error)
        return res.code(500).send({
            status: false,
            message: "Gagal mengambil data statistik"
        });   
    }
}