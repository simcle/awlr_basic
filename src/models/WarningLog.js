import mongoose from "mongoose";
const { Schema } = mongoose;

const warningLogSchema = new Schema({
    unorId: {
        type: String, 
        required: true,
        index: true
    },
    dasId: {
        type: String, 
        required: true,
        index: true
    },
    pdaId: {
        type: String,
        required: true,
        index: true
    },

    level: { type: Number, required: true }, 
    warningStatus: {
        type: String,
        enum: ["AMAN", "WASPADA", "SIAGA", "AWAS"],
        required: true
    },

    // === PESAN TAMBAHAN ===
    message: { type: String, default: null },

}, {
    timestamps: { createdAt: "timestamp", updatedAt: false }
});

warningLogSchema.index({ pdaId: 1, timestamp: -1 });
warningLogSchema.index({ warningStatus: 1, timestamp: -1 });

export default mongoose.model("WarningLog", warningLogSchema);