import axios from 'axios'

const baseUrl = process.env.VUE_APP_BASE_URL
export default axios.create({
  baseURL: baseUrl
})
