import Vue from 'vue'
import Vuex from 'vuex'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import axios from 'axios'
import store from '../src/store/store'
import { Socket } from 'phoenix'
import AvComponents from '@aetherial/aetherial-vue'
import './styles/application.scss'
import '@fortawesome/fontawesome-free/css/all.css'

// Setup Apis
const baseUrl = process.env.VUE_APP_BASE_URL
const socketUrl = process.env.VUE_APP_SOCKET_URL
Vue.prototype.$axios = axios.create({
  baseURL: baseUrl
})
Vue.prototype.$socket = new Socket(socketUrl, { params: { userToken: '123' } })

Vue.use(AvComponents)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
