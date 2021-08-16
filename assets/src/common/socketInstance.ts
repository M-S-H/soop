import { Socket } from 'phoenix'

const socketUrl = process.env.VUE_APP_SOCKET_URL
export default new Socket(socketUrl, {
  params: { userToken: '123' }
})
