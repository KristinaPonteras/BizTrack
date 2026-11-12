
import axios from 'axios'

const api = axios.create({
    baseURL: 'https://biztrack-v454.onrender.com/api',
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('biztrack_token')

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

export default api
