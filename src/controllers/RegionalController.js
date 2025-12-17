import axios from "axios";

const axiosRegional = axios.create({
    baseURL: 'https://api-regional-indonesia.vercel.app/api',
    timeout: 10000
})

export const getProvinces = async (req, res) => {
    try {
        const response = await axiosRegional.get('/provinces?sort=name')
        return res.send({
            status: true,
            data: response.data.data
        })
    } catch (error) {
        console.log(error)
    }
}

export const getCities = async (req, res) => {
    try {
        const {provinceId} = req.params
        const response = await axiosRegional.get(`/cities/${provinceId}?sort=name`)
        return res.send({
            status: true,
            data: response.data.data
        })
    } catch (error) {
        
    }
}

export const getDistricts = async (req, res) => {
    try {
        const { cityId } = req.params
        const response = await axiosRegional.get(`/districts/${cityId}?sort=name`)
        return res.send({
            status: true,
            data: response.data.data
        })
    } catch (error) {
        
    }
}

export const getVillages = async (req, res) => {
    try {
        const { districtId } = req.params
        const response = await axiosRegional.get(`/villages/${districtId}`)
        return res.send({
            status: true,
            data: response.data.data
        })
    } catch (error) {
        
    }
}