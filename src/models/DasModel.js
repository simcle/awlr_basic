import mongoose from "mongoose";
import Counter from "./Counter.js";
const { Schema } = mongoose;

const DasSchema = new Schema({
    _id: {
        type: String
    },
    name: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    descriptions: {
        type: String,
        default: null
    },
    unorId: {
        type: String, 
        ref: 'UnitOrganisasi', 
        required: true
    }
}, {
    timestamps: true
});

DasSchema.index({ name: 1, unorId: 1 }, { unique: true });

// ====== AUTO GENERATE ID: DAS-0001 ======
DasSchema.pre("validate", async function(next) {
    if (this._id) return next(); // jika sudah ada, skip

    // update counter
    const counter = await Counter.findOneAndUpdate(
        { name: "das" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    // buat id: UNR-0001
    const num = String(counter.seq).padStart(4, "0");
    this._id = `DAS-${num}`;

    next();
});

export default mongoose.model("DaerahAliranSungai", DasSchema);