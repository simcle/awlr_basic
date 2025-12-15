import PdaModel from "../models/PdaModel.js";
import NotificationsModel from "../models/NotificationsModel.js";
import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs'
import { pipeline } from "stream/promises";

const uploadDir = path.join(process.cwd(), 'public/uploads/pda')

if(!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {recursive: true})
}

export const createPda = async (req, res) => {
    try {
        const unorId = req.user.unorId
        const data = {}
        data.unorId = unorId
        const parts = req.parts()
        for await ( const part of parts) {
            if(part.file) {
                const filename = `${Date.now()}.png`
                const filePath = path.join(uploadDir, filename)
                await pipeline(part.file, fs.createWriteStream(filePath))
                data.image = `uploads/pda/${filename}` 
            } else {
                if (["province", "city", "district", "village", "threshold"].includes(part.fieldname)) {
                    data[part.fieldname] = JSON.parse(part.value);
                } else {
                    data[part.fieldname] = part.value;
                }
            }
        }

        const saved = await PdaModel.create(data);

        return res.send({
            status: true,
            message: "PDA berhasil dibuat",
            data: saved,
        });

    } catch (err) {
        console.log(err);

        // Duplicate error (name + dasId)
        if (err.code === 11000) {
            return res.code(400).send({
                status: false,
                message: "Nama PDA sudah digunakan dalam DAS ini",
            });
        }

        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan server",
        });
    }

}

export const getPda = async (req, res) => {
    try {
        const unorId = req.user.unorId
        const { page = 1, limit = 20, search, filterDas } = req.query;

        const limitNum = Number(limit);
        const skip = (page - 1) * limitNum;

        const query = {unorId: unorId};
        if (search) query.name = { $regex: search, $options: "i" };
        if (filterDas) query.dasId = filterDas;

        // ========= BASE PIPELINE =========
        const pipeline = [
            { $match: query },
            { $sort: { createdAt: -1 } }
        ];

        // ======== HANYA TAMBAHKAN PAGINATION JIKA limit > 0 ========
        if (limitNum > 0) {
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: limitNum });
        }

        // ======== POPULATE DAS ========
        pipeline.push(
            {
                $lookup: {
                    from: "daerahaliransungais",
                    localField: "dasId",
                    foreignField: "_id",
                    as: "dasId"
                }
            },
            { $unwind: { path: "$dasId", preserveNullAndEmptyArrays: true } }
        );

        // ========= LAST SENSOR ==========
        pipeline.push(
            {
                $lookup: {
                    from: "sensorreadings",
                    let: { pdaId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$pdaId", "$$pdaId"] } } },
                        { $sort: { timestamp: -1 } },
                        { $limit: 1 }
                    ],
                    as: "lastReading"
                }
            },
            { $unwind: { path: "$lastReading", preserveNullAndEmptyArrays: true } }
        );

        const data = await PdaModel.aggregate(pipeline);

        // kalau limit = 0 → total data = data.length
        const total = limitNum > 0 ? await PdaModel.countDocuments(query) : data.length;

        return res.send({
            status: true,
            data,
            pagination: {
                page: Number(page),
                limit: limitNum,
                totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1
            }
        });

    } catch (error) {
        console.error(error);
        return res.code(500).send({
            status: false,
            message: "Gagal mengambil data PDA"
        });
    }
};

export const getDetailPda = async (req, res) => {
    try {
        const { id } = req.params
        const dataPromise = PdaModel.aggregate([
            {$match: {_id: id}},
            {
                $lookup: {
                    from: "daerahaliransungais",
                    localField: "dasId",
                    foreignField: "_id",
                    as: "das"
                }
            },
            { $unwind: "$das" },
            {$lookup: {
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
        ])


        // STATUS DEVICE MODEM 30 HARI TERAKHIR
        const days = 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const devicePromis =  NotificationsModel.find({
            pdaId: id,
            category: 'device',
            timestamp: {$gte: since}
        })
        .sort({timestamp: -1})
        .limit(50)
        .select('type color timestamp')
        const [data, device] = await Promise.all([
            dataPromise, 
            devicePromis
        ])
        return res.send({
            status: true,
            data: data[0],
            device
        })
    } catch (error) {
        console.log(error);

        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan pada server"
        });
    }
}

export const updatePda = async (req, res) => {
    try {
        
        const { id } = req.params
        const body = {}
        const parts = req.parts()
    
        let newImage = null
    
        for await (const part of parts) {
            if(part.file) {
                const filename = `${Date.now()}.png`
                const filePath = path.join(uploadDir, filename)
                await pipeline(part.file, fs.createWriteStream(filePath))
                newImage = `uploads/pda/${filename}`;
            } else {
                if (["province", "city", "district", "village", "threshold"].includes(part.fieldname)) {
                    body[part.fieldname] = JSON.parse(part.value);
                } else {
                    body[part.fieldname] = part.value;
                }
            }
        }
    
        const existing = await PdaModel.findById(id)
        if (!existing) {
            return res.code(404).send({
                status: false,
                message: "PDA tidak ditemukan",
            });
        }
    
        // delete old file
        if (newImage && existing.image) {
            const oldImg = path.join(process.cwd(), "public", existing.image);
            if (fs.existsSync(oldImg)) fs.unlinkSync(oldImg);
        }
    
        if (newImage) body.image = newImage;
    
        const updated = await PdaModel.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
    
        return res.send({
            status: true,
            message: "PDA berhasil diperbarui",
            data: updated,
        });
    } catch (err) {
        console.log(err)
        if (err.code === 11000) {
            return res.code(400).send({
                status: false,
                message: "Nama PDA sudah digunakan dalam DAS ini",
            });
        }

        return res.code(500).send({
            status: false,
            message: "Gagal memperbarui PDA",
        });
    }
}

export const downloadPdaExcel = async (req, res) => {
    try {
        const unorId = req.user.unorId;
        const { search, filterDas } = req.query;

        const query = { unorId };

        if (search) query.name = { $regex: search, $options: "i" };
        if (filterDas) query.dasId = filterDas;

        // ambil semua PDA tanpa pagination
        const pdaList = await PdaModel.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },

            // populate DAS
            {
                $lookup: {
                    from: "daerahaliransungais",
                    localField: "dasId",
                    foreignField: "_id",
                    as: "das"
                }
            },
            { $unwind: { path: "$das", preserveNullAndEmptyArrays: true } },

            // last reading
            {
                $lookup: {
                    from: "sensorreadings",
                    let: { pdaId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$pdaId", "$$pdaId"] } } },
                        { $sort: { timestamp: -1 } },
                        { $limit: 1 }
                    ],
                    as: "lastReading"
                }
            },
            { $unwind: { path: "$lastReading", preserveNullAndEmptyArrays: true } }
        ]);

        // =======================
        //  BUAT FILE EXCEL
        // =======================
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Daftar PDA');

        // HEADER
        sheet.addRow([
            "No",
            "DAS",
            "Nama PDA",
            "Elevasi (mdpl)",
            "Level (mdpl)",
            "Velocity (m/s)",
            "Debit (m³/s)",
            "Status",
            "Terakhir Update"
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
        pdaList.forEach((pda, i) => {
            sheet.addRow([
                i + 1,
                pda.das?.name ?? "-",
                pda.name ?? "-",
                pda.elevasi ?? null,
                pda.lastReading?.level ?? null,
                pda.lastReading?.velocity ?? null,
                pda.lastReading?.flowrate ?? null,
                pda.lastReading?.warningStatus ?? "-",
                pda.lastReading?.timestamp 
                    ? new Date(pda.lastReading.timestamp).toLocaleString('id-ID')
                    : "-"
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