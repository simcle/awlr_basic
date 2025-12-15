import mongoose from "mongoose";
const { Schema } = mongoose;

const PosDugaAirSchema = new Schema({
    // ID custom opsional, kamu bisa pakai auto generator seperti UNR-XXXX
    _id: { type: String },

    name: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    unorId: {
        type: String,
        ref: 'UnitOrganisasi',
        required: true
    },
    dasId: {
        type: String, // gunakan UNR-XXXX dari DAS
        ref: 'DaerahAliranSungai',
        required: true
    },
    // Lokasi manual input
    location: {
        type: String,
        default: null
    },

    // Wilayah Administratif
    province: {
        id: { type: Number },
        name: { type: String }
    },
    city: {
        id: { type: Number },
        name: { type: String }
    },
    district: {
        id: { type: Number },
        name: { type: String }
    },
    village: {
        id: { type: Number },
        name: { type: String }
    },

    // Koordinat
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    
    // elevasi
    elevasi: {
        type: Number,
        default: null
    },
    // Perangkat
    serialNumber: {
        type: String,
        default: null
    },
    gsmNumber: {
        type: String,
        default: null
    },

    // Peringatan dini
    threshold: {
        aman: { type: Number, default: 0 },
        waspada: { type: Number, default: null },
        siaga: { type: Number, default: null },
        awas: { type: Number, default: null }
    },

    // Foto PDA
    image: { type: String, default: null },
    lastSeen: {
        type: Date,
        default: null
    },
    sensorStatus: {
        type: String,
        enum: ['ONLINE', 'OFFLINE'],
        default: 'OFFLINE'
    },
    sensorStatusLevel: {
        type: String,
        enum: ["AMAN", "WASPADA", "SIAGA", "AWAS", "UNKNOWN"],
        default: "UNKNOWN"
    }

}, { timestamps: true });

PosDugaAirSchema.index({name: 1, dasId: 1}, {unique: true})

// ====== AUTO GENERATE ID: PDA-0001 ======
PosDugaAirSchema.pre("validate", async function(next) {
    if (this._id) return next(); // jika sudah ada, skip
        this._id = String(Date.now());
    next();
});

export default mongoose.model("PosDugaAir", PosDugaAirSchema);