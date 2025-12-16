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
    chatId: {
        type: String,
        default: false
    },
    isActive: {
        type: Boolean,
        default: false
    }
})

TelegramBotSchema.index({unorId: 1, chatId: 1}, {unique: true})
export default mongoose.model('TelegramBot', TelegramBotSchema)