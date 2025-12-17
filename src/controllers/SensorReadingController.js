import DasModel from '../models/DasModel.js'
import PdaModel from '../models/PdaModel.js'
import SensorReading from '../models/SensorReading.js';
import NotificationService from '../services/NotificationService.js';
import ExcelJS from 'exceljs';



// pembulatan 2 digit
const round2 = (value) => {
    if (value == null) return null;
    return Math.round(value * 100) / 100;
};

// Tentukan status peringatan dini
const getWarningStatus = (level, threshold = {}) => {
    if (level == null) return "UNKNOWN";

    const { aman, waspada, siaga, awas } = threshold;

    // Jika semua threshold null → aman saja
    if ([aman, waspada, siaga, awas].every(v => v == null)) {
        return "AMAN";
    }

    if (awas != null && level >= awas) return "AWAS";
    if (siaga != null && level >= siaga) return "SIAGA";
    if (waspada != null && level >= waspada) return "WASPADA";
    if (aman != null && level >= aman) return "AMAN";

    return "AMAN";
};

export const saveReading = async (req, res) => {
    try {
        const { pdaId } = req.params 
        const { rawLevel, rawVelocity, rawFlowrate, battery, signalRssi } = req.body

        
        // VALIDASI PARAMS PDA
        if (!pdaId) {
            return res.code(400).send({
                status: false,
                message: "pdaId tidak ditemukan di URL"
            });
        }

        // CEK PDA DI DATABASE
        const pda = await PdaModel.findOne({ _id: pdaId }).select("unorId dasId name elevasi threshold sensorStatusLevel sensorStatus");
        if (!pda) {
            return res.code(404).send({
                status: false,
                message: "PDA tidak ditemukan"
            });
        }
       

        // HITUNG PROCESSED VALUES

        let level = null;
        if (rawLevel != null) {
            // hitung level dasar + elevasi
            const computed = rawLevel + (pda.elevasi ?? 0);

            // jika negatif → paksa ke nol
            const safeValue = computed < 0 ? 0 : computed;

            level = round2(safeValue);
        }
        const velocity = round2(rawVelocity ?? 0)
        const flowrate = round2(rawFlowrate ?? 0)


        // HITUNG WARNING
        // hitung status baru
        const currentStatus = getWarningStatus(level, pda.threshold);
        const previousStatus = pda.sensorStatusLevel ?? "UNKNOWN";

        // INSERT TELEMETRY
        await SensorReading.create({
            pdaId,
            unorId: pda.unorId,
            dasId: pda.dasId,

            // processed data
            level,
            velocity,
            flowrate,

            // raw data
            rawLevel: rawLevel ?? null,
            rawVelocity: rawVelocity ?? null,
            rawFlowrate: rawFlowrate ?? null,

            battery: battery ?? null,
            signalRssi: signalRssi ?? null,

            // peringatan dini
            warningStatus: currentStatus
        });

        // NOTIFKASI STATUS
        await NotificationService.handleWarnig({
            server: req.server,
            pda,
            level,
            previousStatus,
            currentStatus  
        })

        // UPDATE REALTIME
        if(currentStatus === previousStatus) {
            await NotificationService.emitUpdate({
                server: req.server,
                pda,
                level,
                currentStatus
            })
        }

        // NOTIF ONLINE
        await NotificationService.handleOnline({
            server: req.server,
            pda
        })
        await PdaModel.updateOne(
            { _id: pdaId },
            {
                $set: {
                    lastSeen: new Date(),
                    sensorStatus: "ONLINE",
                    sensorStatusLevel: currentStatus
                }
            }
        );

        return res.send({
            status: true,
            message: "Data telemetry berhasil disimpan",
            warningStatus: currentStatus
        });

    } catch (error) {
        console.error("Save Reading Error:", error);
        return res.code(500).send({
            status: false,
            message: "Gagal menyimpan data telemetry"
        });
    }
}

const normalizeStartEnd = (start, end) => {
    const s = new Date(start)
    s.setHours(0, 0, 0, 0)
    const e = new Date(end)
    e.setHours(23, 59, 59, 999)
    return { s, e }
}
export const getReading = async (req, res) => {
    try {
        const unorId = req.user.unorId
        // query params
        const {
            mode,
            start,
            end,
            dasId,
            pdaId,
            page = 1,
            limit = 20
        } = req.query;
        
        if (!start || !end) {
            return res.code(400).send({
                status: false,
                message: "Parameter start dan end wajib diisi"
            });
        }
        
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        
        // ============================
        // 🔎 FILTER UTAMA
        // ============================
        const { s, e } = normalizeStartEnd(start, end)
        const match = {
            unorId,
            timestamp: {
                $gte: s,
                $lte: e
            }
        };

        if (dasId) match.dasId = dasId;
        if (pdaId) match.pdaId = pdaId;

        // ============================
        // 🔥 PIPELINE AGGREGATE
        // ============================
        const pipeline = [
            { $match: match },

            // urutkan data dari terbaru → lama
            { $sort: { timestamp: -1 } },

            // pagination
            { $skip: skip },
            { $limit: limitNum },

            // join PDA
            {
                $lookup: {
                    from: "posdugaairs",
                    localField: "pdaId",
                    foreignField: "_id",
                    as: "pda"
                }
            },
            { $unwind: "$pda" },

            // join DAS
            {
                $lookup: {
                    from: "daerahaliransungais",
                    localField: "dasId",
                    foreignField: "_id",
                    as: "das"
                }
            },
            { $unwind: "$das" },
            {
                $project: {
                    _id: 1,
                    timestamp: 1,
                    level: 1,
                    velocity: 1,
                    flowrate: 1,
                    battery: 1,
                    signalRssi: 1,
                    warningStatus: 1,

                    // PDA
                    "pda.name": 1,

                    // DAS
                    "das.name": 1
                }
            }
        ];

        const data = await SensorReading.aggregate(pipeline);
        // ============================
        // HITUNG TOTAL DATA
        // ============================
        const totalData = await SensorReading.countDocuments(match);
        const totalPages = Math.ceil(totalData / limitNum);

        return res.send({
            status: true,
            data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages,
                totalData
            }
        });
    } catch (error) {
        
    }
}

export const downloadReadingExcel = async (req, res) => {
    try {
        const unorId = req.user.unorId
        // query params
        const {
            mode,
            start,
            end,
            dasId,
            pdaId,
            page = 1,
            limit = 20
        } = req.query;
        
        if (!start || !end) {
            return res.code(400).send({
                status: false,
                message: "Parameter start dan end wajib diisi"
            });
        }
        
        
        // ============================
        // 🔎 FILTER UTAMA
        // ============================
        const { s, e } = normalizeStartEnd(start, end)
        const match = {
            unorId,
            timestamp: {
                $gte: s,
                $lte: e
            }
        };

        if (dasId) match.dasId = dasId;
        if (pdaId) match.pdaId = pdaId;

        // ============================
        // 🔥 PIPELINE AGGREGATE
        // ============================
        const pipeline = [
            { $match: match },

            // urutkan data dari terbaru → lama
            { $sort: { timestamp: -1 } },

            // join PDA
            {
                $lookup: {
                    from: "posdugaairs",
                    localField: "pdaId",
                    foreignField: "_id",
                    as: "pda"
                }
            },
            { $unwind: "$pda" },

            // join DAS
            {
                $lookup: {
                    from: "daerahaliransungais",
                    localField: "dasId",
                    foreignField: "_id",
                    as: "das"
                }
            },
            { $unwind: "$das" },
            {
                $project: {
                    _id: 1,
                    timestamp: 1,
                    level: 1,
                    velocity: 1,
                    flowrate: 1,
                    battery: 1,
                    signalRssi: 1,
                    warningStatus: 1,

                    // PDA
                    "pda.name": 1,

                    // DAS
                    "das.name": 1
                }
            }
        ];

        const data = await SensorReading.aggregate(pipeline);

        // =======================
        //  BUAT FILE EXCEL
        // =======================
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Daftar PDA');

        // HEADER
        sheet.addRow([
            "No",
            "Tanggal",
            "DAS",
            "Nama PDA",
            "Level (mdpl)",
            "Velocity (m/s)",
            "Debit (m³/s)",
            "Status"
        ]);

        // STYLE HEADER
        sheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE5E5E5' }
            };
        });
        // DATA ROWS
        data.forEach((sn, i) => {
            sheet.addRow([
                i + 1,
                sn.timestamp 
                    ? new Date(sn.timestamp).toLocaleString('id-ID')
                    : "-",
                sn.das?.name ?? "-",
                sn.pda?.name ?? "-",
                sn.level ?? null,
                sn.velocity ?? null,
                sn.flowrate ?? null,
                sn.warningStatus ?? "-"
            ]);
        });

        // Autosize columns
        sheet.columns.forEach((col) => {
            let max = 12;
            col.eachCell({ includeEmpty: true }, (cell) => {
                max = Math.max(max, cell.value ? cell.value.toString().length : 0);
            });
            col.width = max + 2;
        });

        // Filename
        const filename = `DAFTAR-PDA-${Date.now()}.xlsx`;
        const buffer = await workbook.xlsx.writeBuffer()
        // RESPONSE
        res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            .header("Content-Disposition", `attachment; filename=${filename}`)
            .send(buffer);

    } catch (error) {
        console.error("Download Excel Error:", error);
        return res.code(500).send({
            status: false,
            message: "Gagal membuat file Excel"
        });
    }
};

export const getDas = async (req, res) => {
    try {
        const unorId = req.user.unorId
        const das = await DasModel.find({unorId: unorId}).sort({name: 1}).select('_id, name')
       
        return res.send({
            status: true,
            das: das
        })
    } catch (error) {
        console.log(error)
        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan pada server"
        });
    }

}


export const getPda = async (req, res) => {
    try {
        const { dasId } = req.params
        const pda = await PdaModel.find({dasId: dasId}).sort({name: 1}).select('_id, name')
        return res.send({
            status: true,
            pda: pda
        })
    } catch (error) {
        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan pada server"
        });
    }

}