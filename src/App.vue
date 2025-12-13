<script setup lang="ts">
import { onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  // --- CẤU HÌNH THỜI GIAN ---
  // Thời gian chờ tối thiểu (1.5 giây)
  const MIN_LOAD_TIME = 1500

  const loader = document.getElementById('app-loading-overlay')

  if (loader) {
    // Dùng setTimeout để giữ màn hình trắng + vòng quay lâu hơn
    setTimeout(() => {
      // 1. Bắt đầu làm mờ
      loader.style.opacity = '0'

      // 2. Xóa khỏi DOM sau khi hiệu ứng mờ kết thúc (0.5s khớp với CSS)
      setTimeout(() => {
        loader.remove()
        document.body.style.overflow = 'auto' // Trả lại thanh cuộn
      }, 500)
    }, MIN_LOAD_TIME)
  }

  // --- LOGIC AUTH ---
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') router.push('/login')
    if (event === 'SIGNED_IN' && router.currentRoute.value.path === '/login')
      router.push('/dashboard')
  })
})
</script>

<template>
  <router-view />
</template>
