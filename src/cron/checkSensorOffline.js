import PdaModel from '../models/PdaModel.js'
import NotificationsModel from '../models/NotificationsModel.js'

export const checkSensorOffline = async (io) => {
    const timeoutMs = 4 * 60 * 1000; // 4 menit
    const cutoff = new Date(Date.now() - timeoutMs);

    const pdaList = await PdaModel.find({
        sensorStatus: "ONLINE",
        lastSeen: { $lte: cutoff }
    }).select("_id name unorId dasId lastSeen");

    if (!pdaList.length) return;

    for (const pda of pdaList) {
        await PdaModel.updateOne(
            { _id: pda._id },
            { $set: { sensorStatus: "OFFLINE" } }
        );
        
        console.log(`PDA ${pda.name} dinyatakan OFFLINE (lebih dari 4 menit)`);

        await NotificationsModel.create({
            pdaId: pda._id,
            dasId: pda.dasId,
            unorId: pda.unorId,
            type: "OFFLINE",
            isRead: false,
            timestamp: new Date()
        });

        io.to(`unor_${pda.unorId}`).emit("pda:offline", {
            pdaId: pda._id,
            name: pda.name,
            sensorStatus: 'OFFLINE',
            message: `${pda.name} OFFLINE (tidak mengirim data lebih dari 4 menit)`,
            updatedAt: new Date()
        });
    }
};