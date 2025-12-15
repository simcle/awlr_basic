import mongoose from "mongoose";
const { Schema } = mongoose;

const NotificationSchema = new Schema({
    unorId: { 
        type: String,
        ref: 'UnitOrganisasi',
        required: true
    },
    dasId: {
        type: String,
        ref: 'DaerahAliranSungai',
        required: true,
    },
    pdaId: {
        type: String,
        ref: 'PosDugaAir'
    },

    // =====================================================
    // 🔥 KATEGORI NOTIFIKASI
    // =====================================================
    category: {
        type: String,
        enum: ["warning", "device", "system", "other"],
        default: null
    },

    type: {
        type: String,
        enum: ["AMAN","WASPADA","SIAGA","AWAS","ONLINE","OFFLINE","SYSTEM"],
        required: true
    },

    color: { type: String, default: 'text-gray-300' },
    level: { type: Number, default: null },
    message: { type: String, default: null },

    isRead: { type: Boolean, default: false },

    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index
NotificationSchema.index({ pdaId: 1, timestamp: -1 });


// ====================================================
// 🔥 PRE-HOOK: SET COLOR, MESSAGE, CATEGORY OTOMATIS
// ====================================================
NotificationSchema.pre("validate", function (next) {

    // --- CATEGORY HANDLING ---
    const typeCategoryMap = {
        AMAN: "warning",
        WASPADA: "warning",
        SIAGA: "warning",
        AWAS: "warning",
        ONLINE: "device",
        OFFLINE: "device",
        SYSTEM: "system"
    };

    // isi category otomatis berdasarkan type
    if (this.type && !this.category) {
        this.category = typeCategoryMap[this.type] || "other";
    }

    // --- COLOR & MESSAGE HANDLING ---
    const defaults = {
        AMAN: {
            color: 'text-green-500',
            message: 'Kondisi kembali normal. Tidak ada ancaman banjir.'
        },
        WASPADA: {
            color: 'text-blue-500',
            message: 'Harap tingkatkan kewaspadaan. Posisi air mulai mengalami kenaikan.'
        },
        SIAGA: {
            color: 'text-yellow-500',
            message: 'Ketinggian air cukup tinggi. Siapkan mitigasi banjir dan peringatan dini.'
        },
        AWAS: {
            color: 'text-red-500',
            message: 'Ketinggian air berbahaya. Lakukan tindakan darurat!'
        },
        ONLINE: {
            color: 'text-green-500',
            message: 'Perangkat kembali ONLINE.'
        },
        OFFLINE: {
            color: 'text-red-500',
            message: 'Perangkat OFFLINE dan tidak mengirim data.'
        },
        SYSTEM: {
            color: 'text-gray-500',
            message: 'Sistem menjalankan proses otomatis.'
        }
    };

    const config = defaults[this.type];

    if (config) {
        if (!this.color || this.color === "text-gray-300") {
            this.color = config.color;
        }
        if (!this.message) {
            this.message = config.message;
        }
    }

    next();
});

export default mongoose.model("Notification", NotificationSchema);