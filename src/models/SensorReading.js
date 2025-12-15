import mongoose from "mongoose";
const { Schema } = mongoose;

const sensorReadingSchema = new Schema({
    // ======== STRING ID (BUKAN OBJECTID) ========
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

    // ======== SENSOR VALUES ========
    level:      { type: Number, default: null },
    velocity:   { type: Number, default: null },
    flowrate:   { type: Number, default: null },

    // ======== RAW SENSOR VALUES ========
    rawLevel:    { type: Number, default: null },
    rawVelocity: { type: Number, default: null },
    rawFlowrate: { type: Number, default: null },

    // ======== DEVICE META ========
    battery:     { type: Number, default: null },
    signalRssi:  { type: Number, default: null },
    sensorStatus: { 
        type: String,
        enum: ['OK', 'ERROR', 'OFFLINE'],
        default: 'OK'
    },
    warningStatus: {
        type: String,
        enum: ['AMAN', 'WASPADA', 'SIAGA', 'AWAS', 'UNKNOWN'],
        default: 'UNKNOWN'
    },

}, {
    timestamps: { createdAt: 'timestamp', updatedAt: false }
});

sensorReadingSchema.index({ pdaId: 1, timestamp: -1 });
sensorReadingSchema.index({ dasId: 1, timestamp: -1 });
sensorReadingSchema.index({ unorId: 1, timestamp: -1 });

export default mongoose.model("SensorReading", sensorReadingSchema);