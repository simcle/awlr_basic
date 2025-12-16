import mongoose from "mongoose";

const { Schema } = mongoose;

const TelegramBotSchema = new Schema({
    unorId: {
        type: String,
        ref: 'UnitOrganisasi',
        required: true
    },
    botToken: {
        type: String,
        required: true,
        select: false
    },
    botLink: {
        type: String,
        default: null
    },
    chatId: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: false
    }
})

TelegramBotSchema.index({unorId: 1, chatId: 1}, {unique: true})
export default mongoose.model('TelegramBot', TelegramBotSchema)