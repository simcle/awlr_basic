import UserModel from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';


export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await UserModel.findOne({email}).populate('unorId')

        if(!user) {
            return res.code(400).send({
                status: false,
                message: 'Invalid email or password'
            });
        }

       
        const match = await bcrypt.compare(password, user.password)
        if (!match) {
            return res.code(400).send({
                status: false,
                message: 'Invalid email or password'
            });
        }
        
        const token = jwt.sign(
            {userId: user._id, unorId: user.unorId._id}, process.env.JWT_SECRET, {expiresIn: '1d'}
        )
        return res.send({
            status: true,
            user: user.name,
            email: user.email,
            unorId: user.unorId._id,
            unorName: user.unorId.name,
            unorAddress: user.unorId?.address,
            unorContactPerson: user.unorId?.contactPerson,
            logo: user.unorId?.logo,
            token: token
        })
    } catch (error) {
        return reply.code(500).send({
            status: false,
            message: 'Internal Server Error'
        });
    }
}

export const getMe = async (req, res) => {
    try {
        const userId = req.user.userId
        const user = await UserModel.findById(userId).populate('unorId')
        return res.send({
            status: true,
            user: user.name,
            email: user.email,
            unorId: user.unorId._id,
            unorName: user.unorId.name,
            unorAddress: user.unorId?.address,
            unorContactPerson: user.unorId?.contactPerson,
            logo: user.unorId?.logo,
        })
    } catch (error) {
        console.log(error)
    }
}

export const updateUser = async (req, res) => {
    try {
        const userId = req.user.userId
        const body = req.body
       
        if(body.password) {
            const hashed = await bcrypt.hash(body.password, 10)
            await UserModel.findByIdAndUpdate(userId, {
                $set: {name: body.name, email: body.email, password: hashed}
            })
        } else {
            await UserModel.findByIdAndUpdate(userId, {
                $set: {name: body.name, email: body.email}
            })
        }
        return res.send({
            status: true,
            data: {
                name: body.name,
                email: body.email
            }
        })

    } catch (err) {
        if (err.code === 11000) {
            return res.code(400).send({
                status: false,
                message: "Email ini sudah digunakan",
            });
        }

        return res.code(500).send({
            status: false,
            message: "Gagal memperbarui Pengguna",
        });
    }
}