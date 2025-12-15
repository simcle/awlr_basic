import UnorModel from '../models/UnorModel.js'
import UserModel from '../models/UserModel.js'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'

const uploadDir = path.join(process.cwd(), 'public/uploads/unor')
if(!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {recursive: true})
}

export const registerUnor = async (req, res) => {
    try {
        const { unit_organisasi, address, contactPerson, name, email, password} = req.body
        const unorExists = await UnorModel.findOne({name: unit_organisasi})
        const userExists = await UserModel.findOne({email: email})

        if(unorExists && !userExists) {
            return res.code(400).send({
                success: false,
                type: "unor_exists",
                message: "Unit organisasi is already registered"
            })
        }

        if(!unorExists && userExists) {
            return res.code(400).send({
                success: false,
                type: "user_exists",
                message: "User already registered"
            })
        }

        if(unorExists && userExists) {
            return res.code(400).send({
                success: false,
                type: "unor_user_exists",
                message: "Unit organisasi and user is already exists"
            })
        }
        const hashed = await bcrypt.hash(password, 10)
        const unor = await new UnorModel({name: unit_organisasi, address: address, contactPerson: contactPerson}).save()

        await new UserModel({
            name: name,
            email: email,
            password: hashed,
            unorId: unor._id
        }).save()

        return res.code(201).send({
            status: true,
            message: "User registered successfully"
        });

    } catch (error) {
        console.log(error)
        return res.code(500).send({
            status: false,
            message: "Internal Server Error"
        });        
    }
}


export const updateUnor = async (req, res) => {
    try {
        const unorId = req.user.unorId
        const body = {}
        const parts = req.parts()

        let newImage = null
        for await (const part of parts ) {
            if(part.file) {
                const filename = `${Date.now()}.png`
                const filePath = path.join(uploadDir, filename)
                await pipeline(part.file, fs.createWriteStream(filePath))
                newImage = `uploads/unor/${filename}`;
            } else {
                body[part.fieldname] = part.value
            }
        }

        const existing = await UnorModel.findById(unorId)

        if (!existing) {
            return res.code(404).send({
                status: false,
                message: "UNOR tidak ditemukan",
            });
        }

        // delete image
        if (newImage && existing.logo) {
            const oldImg = path.join(process.cwd(), "public", existing.logo);
            if (fs.existsSync(oldImg)) fs.unlinkSync(oldImg);
        }

        if (newImage) body.logo = newImage;

        const updated = await UnorModel.findByIdAndUpdate(unorId, body, {
            new: true,
            runValidators: true,
        });

        return res.send({
            status: true,
            message: "UNOR berhasil diperbarui",
            data: updated,
        });
    } catch (error) {
        console.log(error)
        if (err.code === 11000) {
            return res.code(400).send({
                status: false,
                message: "Nama UNOR sudah digunakan",
            });
        }

        return res.code(500).send({
            status: false,
            message: "Gagal memperbarui UNOR",
        });
    }
}