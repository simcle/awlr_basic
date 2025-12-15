import axios from "axios";

axios.defaults.baseURL = 'https://api-regional-indonesia.vercel.app/api'

export const getProvinces = async (req, res) => {
    try {
        const response = await axios.get('/provinces?sort=name')
        return res.send({
            status: true,
            data: response.data.data
        })
    } catch (error) {
        
    }
}

export const getCities = async (req, res) => {
    try {
        const {provinceId} = req.params
        const response = await axios.get(`/cities/${provinceId}?sort=name`)
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
        const response = await axios.get(`/districts/${cityId}?sort=name`)
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
        const response = await axios.get(`/villages/${districtId}`)
        return res.send({
            status: true,
            data: response.data.data
        })
    } catch (error) {
        
    }
}