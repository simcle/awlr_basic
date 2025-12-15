import DasModel from "../models/DasModel.js";
import PdaModel from '../models/PdaModel.js';

export const getAllDas = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = ''} = req.query
        const unorId = req.user.unorId
        const query = {
            unorId
        }

        if(search) {
            query.name = { $regex: search, $options: 'i'}
        }
        const skip = (page - 1) * limit
        const [ dasList, total ] = await Promise.all([
            DasModel.find(query)
                .sort({ createdAt: -1})
                .skip(skip)
                .limit(limit),
            DasModel.countDocuments(query)
        ])

        const result = await Promise.all(dasList.map(async (das) => {
            const count = await PdaModel.countDocuments({ dasId: das._id })
            return {
                ...das.toObject(),
                pdaCount: count
            }
        }))
        return res.send({
            status: true,
            message: "List DAS ditemukan",
            data: result,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.log(error)
        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan pada server"
        });
    }
}

export const createDas = async (req, res) => {
    try {
        const unorId = req.user.unorId
        const { name, descriptions } = req.body
        const das = await DasModel.create({
            name,
            descriptions,
            unorId
        })
        return res.code(201).send({
            status: true,
            data: das
        })
    } catch (error) {
        console.log(error)
        if (error.code === 11000) {
            return res.code(400).send({
                status: false,
                message: "Nama DAS sudah terdaftar"
            });
        }
        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan pada server"
        });
    }
}

export const updateDas = async (req, res) => {
    try {
        const {id} = req.params
        const { name, descriptions } = req.body
        const updated = await DasModel.findByIdAndUpdate(
            id,
            { name: name, descriptions: descriptions},
            { new: true}
        )
        if(!updated) {
            return res.code(404).send({
                status: false,
                message: "DAS tidak ditemukan"
            });
        }
        return res.send({
            status: true,
            message: "DAS berhasil diperbarui",
            data: updated
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.code(400).send({
                status: false,
                message: "Nama DAS sudah terdaftar pada Unit Organisasi ini"
            });
        }

        console.error(error);
        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan pada server"
        });
    }
}

export const deleteDas = async (req, res) => {
    try {
        const { id } = req.params
        const deleted = await DasModel.findByIdAndDelete(id)
        if (!deleted) {
            return res.code(404).send({
                status: false,
                message: "DAS tidak ditemukan"
            });
        }

        return res.send({
            status: true,
            message: "DAS berhasil dihapus"
        });
    } catch (error) {
        console.error(error);
        return res.code(500).send({
            status: false,
            message: "Terjadi kesalahan pada server"
        });
    }
}