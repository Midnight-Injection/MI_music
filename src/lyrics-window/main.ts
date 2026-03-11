import { createApp } from 'vue'
import { createPinia } from 'pinia'
import LyricsWindow from './LyricsWindow.vue'

const app = createApp(LyricsWindow)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
