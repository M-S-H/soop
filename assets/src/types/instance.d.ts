import { AxiosInstance } from 'axios'
import VueRouter from 'vue-router'
import { Socket } from 'phoenix'

declare module 'vue/types/vue' {
  interface Vue {
    $axios: AxiosInstance;
    $router: VueRouter;
    $socket: Socket;
  }
}
