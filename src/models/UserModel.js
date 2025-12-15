import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    unorId: { type: String, ref: 'UnitOrganisasi'}
}, {
    timestamps: true
})

export default mongoose.model('User', UserSchema)