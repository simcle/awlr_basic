import TelegramBot from "../models/TelegramBot.js";
import axios from "axios";
axios.defaults.baseURL = 'https://api.telegram.org'
const webhookUrl = 'https://apiawlrbasic.ndpteknologi.com/api/telegram/webhook'
export const getTelegramBot = async (req, res) => {
    try {
        const unorId = req.user.unorId
        const telegram = await TelegramBot.findOne({unorId}).select('+botToken')
        const token = telegram.botToken
        const maskedToken = token ? token.slice(0, 10) + ":XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX": null
        
        return res.send({
            status: true,
            token: maskedToken,
            isActive: telegram.isActive,
            chatId: telegram.chatId
        })
    } catch (error) {
        
    }
}

export const createTelegramBot = async (req, res) => {
    try {
        const unorId = req.user.unorId
        const { botToken } = req.body
        const telegram = await TelegramBot.create({
            unorId,
            botToken
        })
        const token = telegram.botToken
        const maskedToken = token ? token.slice(0, 10) + ":XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX": null
        await axios.post(`/bot${token}/setWebhook?url=${webhookUrl}&secret_token=${unorId}`)
       
        return res.code(201).send({
            status: true,
            token: maskedToken,
            isActive: telegram.isActive,
            chatId: telegram.chatId
        })
    } catch (error) {
        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan pada server"
        });
    }
}

export const deleteTelegramBot = async (req, res) => {
    try {
        const unorId = req.user.unorId
        const deleted = await TelegramBot.findOneAndDelete(unorId).select('+botToken')
        const token = deleted.botToken
        await axios.post(`/bot${token}/deleteWebhook?url=https://webhook.site/cc4060c5-a629-4aa4-ba37-fd904ae97296`)
        return res.send({
            status: true,
            deleted
        })
    } catch (error) {
        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan pada server"
        });
    }
}

export const webhookTelegram = async (req, res) => {
    try {
        const unorId = req.headers["x-telegram-bot-api-secret-token"];
        const update = req.body
        const chat = update.message.chat
        const chatId = chat.id 
        const text = update.message.text.trim()
        const message = update.message
        if (!message) {
            return reply.code(200).send();
        }
        // 🚫 ABAIKAN pesan dari bot sendiri
        if (message.from?.is_bot) {
            return reply.code(200).send();
        }

        const bot = await TelegramBot.findOne({unorId: unorId}).select('+botToken')
        if(!bot) {
            return res.code(200).send();
        }
        
        const token = bot.botToken
        if(text == '/start') {
            await TelegramBot.findOneAndUpdate(
                {unorId},
                {isActive: true, chatId},
                {upsert: true, new: true}
            )
            await axios.post(`bot${token}/sendMessage`, {
                chat_id: chatId,
                text: `*Telegram berhasil terhubung*
Notifikasi AWLR untuk akun Anda sudah aktif. Anda akan menerima peringatan sesuai pengaturan.`,
                parse_mode: "Markdown"
            })
            return res.code(200).send()
        }
    } catch (error) {
        return res.code(200).send()
    }
}

export const sendTelegram = async (unorId, message) => {
    try {
        const botConfig = await TelegramBot.findOne({unorId: unorId, isActive: true}).select('+botToken')
        if(!botConfig) return
        const token = botConfig.botToken
        const chatId = botConfig.chatId
        await axios.post(`bot${token}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown"
        })
    } catch (error) {
        
    }
}

