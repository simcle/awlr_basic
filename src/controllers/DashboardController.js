import PdaModel from "../models/PdaModel.js";

export const getAllPda = async (req, res) => {
    try {
        const unorId = req.user?.unorId;
        const { dasId } = req.query

        if (!unorId) {
            return res.code(400).send({
                status: false,
                message: "unorId is required"
            });
        }

        const matchStage = {
            unorId,
            latitude: { $ne: null },
            longitude: { $ne: null }
        };

        // 🔥 Jika ada dasId → filter
        if (dasId) {
            matchStage.dasId = dasId;
        }

        const data = await PdaModel.aggregate([
            {
                $match: matchStage
            },

            // JOIN ke DAS
            {
                $lookup: {
                    from: "daerahaliransungais",
                    localField: "dasId",
                    foreignField: "_id",
                    as: "das"
                }
            },
            { $unwind: "$das" },

            // JOIN ke SensorReading → ambil data terbaru per PDA
            {
                $lookup: {
                    from: "sensorreadings",
                    let: { pdaKey: "$_id" },
                    pipeline: [
                        { 
                            $match: { 
                                $expr: { $eq: ["$pdaId", "$$pdaKey"] } 
                            } 
                        },
                        { $sort: { timestamp: -1 } },
                        { $limit: 1 }
                    ],
                    as: "lastReading"
                }
            },
            {
                $unwind: {
                    path: "$lastReading",
                    preserveNullAndEmptyArrays: true
                }
            },

            // pilih field yang dikirim (ringan)
            {
                $project: {
                    _id: 1,
                    name: 1,

                    // lokasi
                    location: 1,
                    province: 1,
                    city: 1,
                    district: 1,
                    village: 1,
                    latitude: 1,
                    longitude: 1,
                    elevasi: 1,

                    // perangkat
                    serialNumber: 1,
                    gsmNumber: 1,

                    // threshold
                    threshold: 1,
                    image: 1,

                    // STATUS PERANGKAT & LEVEL
                    sensorStatus: 1,          // ONLINE / OFFLINE <- penting
                    sensorStatusLevel: 1,      // AMAN/WASPADA/SIAGA/AWAS

                    // INFO DAS
                    das: {
                        _id: 1,
                        name: 1,
                    },

                    // SENSOR LAST READING (dari sensorreadings)
                    lastReading: {
                        timestamp: "$lastReading.timestamp",
                        level: "$lastReading.level",
                        velocity: "$lastReading.velocity",
                        flowrate: "$lastReading.flowrate",
                        battery: "$lastReading.battery",
                        signal: "$lastReading.signalRssi",
                        warningStatus: "$lastReading.warningStatus",
                        sensorStatus: "$lastReading.sensorStatus"
                    }
                }
            }
        ]);

        // =================================================
        // 🔥 HITUNG SUMMARY SETELAH AGGREGATE
        // =================================================
        let online = 0;
        let offline = 0;

        const levels = {
            AMAN: 0,
            WASPADA: 0,
            SIAGA: 0,
            AWAS: 0
        };

        data.forEach((pda) => {
            // STATUS DEVICE ONLINE/OFFLINE
            if (pda.sensorStatus === "ONLINE") online++;
            else offline++;

            // LEVEL WARNING
            if (levels[pda.sensorStatusLevel] !== undefined) {
                levels[pda.sensorStatusLevel]++;
            }
        });

        return res.send({
            status: true,
            total: data.length,
            online,
            offline,
            levels,
            data
        });

    } catch (error) {
        console.log(error);

        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan pada server"
        });
    }
};