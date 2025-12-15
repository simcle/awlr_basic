import WarningLog from '../models/WarningLog.js'
import ExcelJS from 'exceljs'

const normalizeStartEnd = (start, end) => {
    const s = new Date(start)
    s.setHours(0, 0, 0, 0)
    const e = new Date(end)
    e.setHours(23, 59, 59, 999)
    return { s, e }
}
export const getWarning = async (req, res) => {
    try {
        const unorId = req.user.unorId
        // query params
        const {
            mode,
            start,
            end,
            dasId,
            pdaId,
            statusWarning,
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
        if (statusWarning) match.warningStatus = statusWarning
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
                    warningStatus: 1,
                    message: 1,

                    // PDA
                    "pda.name": 1,

                    // DAS
                    "das.name": 1
                }
            }
        ];

        const data = await WarningLog.aggregate(pipeline);
        // ============================
        // HITUNG TOTAL DATA
        // ============================
        const totalData = await WarningLog.countDocuments(match);
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
    } catch (err) {
        console.log(err)
    }
}

export const downloadWarningExcel = async (req, res) => {
    try {
        const unorId = req.user.unorId
        // query params
        const {
            mode,
            start,
            end,
            dasId,
            pdaId,
            statusWarning,
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
        if (statusWarning) match.warningStatus = statusWarning
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
                    warningStatus: 1,
                    message: 1,

                    // PDA
                    "pda.name": 1,

                    // DAS
                    "das.name": 1
                }
            }
        ];

        const data = await WarningLog.aggregate(pipeline);

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
            "Keterangan",
            "Level (mdpl)",
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
        data.forEach((wr, i) => {
            sheet.addRow([
                i + 1,
                wr.timestamp 
                    ? new Date(wr.timestamp).toLocaleString('id-ID')
                    : "-",
                wr.das?.name ?? "-",
                wr.pda?.name ?? "-",
                wr.message ?? "-",
                wr.level ?? null,
                wr.warningStatus ?? "-"
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
        const filename = `PERINGATAN-DINI-${Date.now()}.xlsx`;
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
}