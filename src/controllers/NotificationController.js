import NotificationsModel from '../models/NotificationsModel.js'

export const getUnreadCount = async (req, res) => {
    try {
        const unorId = req.user.unorId
        if (!unorId) {
            return res.code(400).send({
                status: false,
                message: "unorId tidak ditemukan"
            });
        }
        const count = await NotificationsModel.countDocuments({
            unorId,
            isRead: false
        });

        return res.send({
            status: true,
            unread: count
        });
    } catch (error) {
        console.error("Get Unread Count Error:", error);
        return res.code(500).send({
            status: false,
            message: "Gagal mengambil jumlah notifikasi belum dibaca"
        });
    }
}

export const getUnreadNotifications = async (req, res) => {
    try {
        const unorId = req.user.unorId;

        if (!unorId) {
            return res.code(400).send({
                status: false,
                message: "unorId tidak ditemukan pada token"
            });
        }

        const { page = 1, limit = 10, category } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const listMatch = {
            unorId,
            isRead: false
        };

        if (category) {
            listMatch.category = category;
        }

        // ------------------------------
        // 1️⃣ PIPELINE DATA UNREAD + PDA
        // ------------------------------
        const pipeline = [
            { $match: listMatch },

            { $sort: { timestamp: -1 } },

            { $skip: skip },
            { $limit: limitNum },

            {
                $lookup: {
                    from: "posdugaairs",
                    localField: "pdaId",
                    foreignField: "_id",
                    as: "pda"
                }
            },
            { $unwind: { path: "$pda", preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    type: 1,
                    category: 1,
                    color: 1,
                    level: 1,
                    message: 1,
                    isRead: 1,
                    timestamp: 1,
                    pdaId: 1,
                    dasId: 1,
                    pdaName: "$pda.name"
                }
            }
        ];

        const dataPromise = NotificationsModel.aggregate(pipeline);

        // ------------------------------
        // 2️⃣ TOTAL UNREAD
        // ------------------------------
        const totalUnreadPromise = NotificationsModel.countDocuments(listMatch);

        // ------------------------------
        // 3️⃣ GLOBAL COUNTER UNREAD (ignore category!)
        // ------------------------------
        const globalMatch = {
            unorId,
            isRead: false
        };

        const counterPromise = NotificationsModel.aggregate([
            { $match: globalMatch},
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            }
        ]);

        const [data, totalUnread, categoryCounts] = await Promise.all([
            dataPromise,
            totalUnreadPromise,
            counterPromise
        ]);

        const totalPages = Math.ceil(totalUnread / limitNum);

        // NORMALISASI COUNTER
        const counters = {
            warning: 0,
            device: 0,
            system: 0,
            other: 0,
            total: totalUnread
        };

        let globalTotal = 0
        categoryCounts.forEach(c => {
            counters[c._id] = c.count;
            globalTotal += c.count;
        });
        counters.total = globalTotal;
        return res.send({
            status: true,
            data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalData: totalUnread,
                totalPages
            },
            counters
        });

    } catch (error) {
        console.error("Get Unread Notifications Error:", error);
        return res.code(500).send({
            status: false,
            message: "Gagal mengambil daftar notifikasi unread"
        });
    }
};
export const getAllNotifications = async (req, res) => {
    try {
        const unorId = req.user.unorId;

        if (!unorId) {
            return res.code(400).send({
                status: false,
                message: "unorId tidak ditemukan pada token"
            });
        }

        const { page = 1, limit = 10, category, pdaId } = req.query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const listMatch = {
            unorId,
        };

        if (category) {
            listMatch.category = category;
        }
        if(pdaId) {
            listMatch.pdaId = pdaId;
        }

        // ------------------------------
        // 1️⃣ PIPELINE DATA UNREAD + PDA
        // ------------------------------
        const pipeline = [
            { $match: listMatch },

            { $sort: { timestamp: -1 } },

            { $skip: skip },
            { $limit: limitNum },

            {
                $lookup: {
                    from: "posdugaairs",
                    localField: "pdaId",
                    foreignField: "_id",
                    as: "pda"
                }
            },
            { $unwind: { path: "$pda", preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    type: 1,
                    category: 1,
                    color: 1,
                    level: 1,
                    message: 1,
                    isRead: 1,
                    timestamp: 1,
                    pdaId: 1,
                    dasId: 1,
                    pdaName: "$pda.name"
                }
            }
        ];

        const dataPromise = NotificationsModel.aggregate(pipeline);

        // ------------------------------
        // 2️⃣ TOTAL UNREAD
        // ------------------------------
        const totalDataPromise = NotificationsModel.countDocuments(listMatch);

        // ------------------------------
        // 3️⃣ GLOBAL COUNTER UNREAD (ignore category!)
        // ------------------------------
        const globalMatch = {
            unorId,
            isRead: false
        };
        if(pdaId) {
            globalMatch.pdaId = pdaId
        }

        const counterPromise = NotificationsModel.aggregate([
            { $match: globalMatch},
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            }
        ]);

        const [data, totalData, categoryCounts] = await Promise.all([
            dataPromise,
            totalDataPromise,
            counterPromise
        ]);

        const totalPages = Math.ceil(totalData / limitNum);

        // NORMALISASI COUNTER
        const counters = {
            warning: 0,
            device: 0,
            system: 0,
            other: 0,
            total: 0
        };

        let globalTotal = 0
        categoryCounts.forEach(c => {
            counters[c._id] = c.count;
            globalTotal += c.count;
        });
        counters.total = globalTotal;
        return res.send({
            status: true,
            data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalData: totalData,
                totalPages
            },
            counters
        });

    } catch (error) {
        console.error("Get Unread Notifications Error:", error);
        return res.code(500).send({
            status: false,
            message: "Gagal mengambil daftar notifikasi unread"
        });
    }
};

export const markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params
        const unorId = req.user.unorId

        const notif = await NotificationsModel.findOneAndUpdate(
            { _id: id, unorId },
            { $set: { isRead: true } },
            { new: true }
        );

        const totalUnread = await NotificationsModel.countDocuments({
            unorId,
            isRead: false
        });

        req.server.io.to(`unor_${unorId}`).emit("notif:updateCount", {
            unreadCount: totalUnread
        });
        res.send({
            status: true,
            data: notif
        })
    } catch (error) {
        console.error("Mark Notification Read Error:", error);
        return res.code(500).send({
            status: false,
            message: "Gagal menandai notifikasi sebagai dibaca"
        });
    }
}

export const markAllNotificationsAsRead = async (req, res) => {
    try {
        const unorId = req.user.unorId

        const notif = await NotificationsModel.updateMany(
            { unorId, isRead: false },
            { $set: { isRead: true } }
        );
        req.server.io.to(`unor_${unorId}`).emit("notif:updateCount", {
            unreadCount: 0
        });
        res.send({
            status: true,
            data: notif.modifiedCount
        })
    } catch (error) {
        console.error("Mark Notification Read Error:", error);
        return res.code(500).send({
            status: false,
            message: "Gagal menandai notifikasi sebagai dibaca"
        });
    }
}