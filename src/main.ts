import './main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import i18n from './i18n' // Import cấu hình i18n
import { getTheme, setTheme } from '@/theme'

const app = createApp(App)

// Apply saved theme globally before mounting so all components render correctly
try {
	const theme = getTheme()
	setTheme(theme)
} catch (e) {
	// ignore
}

// 1. Cài đặt các plugin trước
app.use(createPinia())
app.use(router)
app.use(i18n) // <--- Đưa dòng này lên trước mount

// 2. Sau đó mới mount ứng dụng
app.mount('#app')
