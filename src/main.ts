import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import App from './App.vue'
import router from './router'
import { useUIModeStore } from './store/uiMode'
import { installTVNavigation } from './services/tvNavigation'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// 初始化 UI 模式 (PC/TV/Mobile)
const uiMode = useUIModeStore()
uiMode.init()

// TV 模式下安装 D-Pad 导航
if (uiMode.isTV) {
  installTVNavigation()
}

app.use(router)
app.use(naive)

app.mount('#app')
