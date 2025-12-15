import mongoose from "mongoose";
import Counter from "./Counter.js";
const { Schema } = mongoose;

const UnorSchema = new Schema ({
    _id: {
        type: String
    },
    name: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    address: {
        type: String,
        default: null
    },
    contactPerson: {
        type: String,
        default: null
    },
    logo: {
        type: String,
        default: null
    }
}, {
    timestamps: true
})

// ====== AUTO GENERATE ID: UNR-0001 ======
UnorSchema.pre("validate", async function(next) {
    if (this._id) return next(); // jika sudah ada, skip

    // update counter
    const counter = await Counter.findOneAndUpdate(
        { name: "unor" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    // buat id: UNR-0001
    const num = String(counter.seq).padStart(4, "0");
    this._id = `UNR-${num}`;

    next();
});
export default mongoose.model('UnitOrganisasi', UnorSchema)
