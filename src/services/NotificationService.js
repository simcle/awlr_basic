import WarningLog from "../models/WarningLog.js";
import NotificationsModel from "../models/NotificationsModel.js";
import { sendTelegram } from "../controllers/TelegramBotController.js";
import dayjs from "dayjs";
import 'dayjs/locale/id.js'

const formatTanggal = (date) => {
    return dayjs(date).format("DD/MM/YY HH:mm");
}

const makeWarningMessage = (status, level) => {
    return `Level ${level} memasuki status ${status}`;
};

class NotificationService {
    // HANDLE PERUBAHAN STATUS LEVEL
    static async handleWarnig ({
        server,
        pda,
        level,
        previousStatus,
        currentStatus
    }) {
        // hanya jika status berubah & valid
        if (currentStatus === previousStatus || currentStatus === "UNKNOWN") return

        const warningMessage = makeWarningMessage(currentStatus, level)

        // 1. simpan warning log
        await WarningLog.create({
            pdaId: pda._id,
            dasId: pda.dasId,
            unorId: pda.unorId,
            level,
            warningStatus: currentStatus,
            message: warningMessage,
        })

        // 2. simpan notifikasi (inbox)
        const notif = await NotificationsModel.create({
            pdaId: pda._id,
            dasId: pda.dasId,
            unorId: pda.unorId,
            type: currentStatus,
            level,
            isRead: false,
            timestamp: new Date()
        })

        // 3. emit socket warning
        server.io.to(`unor_${pda.unorId}`).emit('pda:warning', {
            pdaId: pda._id,
            name: pda.name,
            level,
            warningStatus: currentStatus,
            message: makeWarningMessage(currentStatus, level),
            updatedAt: new Date()
        })

        // 4. Kirim telegram
        const telegramMessage = `*${currentStatus}*
Lokasi    : ${pda.name.toUpperCase()}
TMA      : ${level} mdpl
Waktu   : ${formatTanggal(new Date())}
${notif.message}`
        await sendTelegram(pda.unorId, telegramMessage)
    }

    // HANDLE PDA ONLINE (RECOVERY)
    static async handleOnline({server, pda}) {
        const wasOffline = pda.sensorStatus !== 'ONLINE'
        if(!wasOffline) return
        
        // 1. simpan notifikasi (inbox)
        const notif = await NotificationsModel.create({
            pdaId: pda._id,
            dasId: pda.dasId,
            unorId: pda.unorId,
            type: "ONLINE",
            isRead: false,
            timestamp: new Date()
        })

        // 2. emit socket online 
        server.io.to(`unor_${pda.unorId}`).emit('pda:online', {
            pdaId: pda._id,
            message: notif.message,
            sensorStatus: "ONLINE",
            updatedAt: new Date()
        })

        // 3. kirim telegram 
        const telegramMessage = `*ONLINE*
Lokasi    : ${pda.name.toUpperCase()}
Waktu   : ${formatTanggal(new Date())}
${notif.message}`
        await sendTelegram(pda.unorId, telegramMessage)
    }

    // HANDLE PDA OFFLINE 
    static async handleOffline({io, pda}) {
        // 1. simpan notifikasi (inbox)
        const notif = await NotificationsModel.create({
            pdaId: pda._id,
            dasId: pda.dasId,
            unorId: pda.unorId,
            type: "OFFLINE",
            isRead: false,
            timestamp: new Date()  
        })

        // 2. emit socket offline
        io.to(`unor_${pda.unorId}`).emit("pda:offline", {
            pdaId: pda._id,
            name: pda.name,
            sensorStatus: 'OFFLINE',
            message: `${pda.name} OFFLINE (tidak mengirim data lebih dari 4 menit)`,
            updatedAt: new Date()
        });

        // 3. kirim telegram 
        const telegramMessage = `*OFFLINE*
Lokasi    : ${pda.name.toUpperCase()}
Waktu   : ${formatTanggal(new Date())}
${notif.message}`
        await sendTelegram(pda.unorId, telegramMessage)
    }

    // HANDLE UPDATE BIASA (REALTIME)
    static async emitUpdate({server, pda, level, currentStatus}) {
        server.io.to(`unor_${pda.unorId}`).emit("pda:updated", {
            pdaId: pda._id,
            level,
            warningStatus: currentStatus,
            updatedAt: new Date()
        });
    }
}

export default NotificationService