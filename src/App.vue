<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  // Lắng nghe sự thay đổi của Auth (Đăng nhập, Đăng xuất, Refresh Token...)
  supabase.auth.onAuthStateChange((event, session) => {
    // Nếu người dùng đăng xuất (SIGNED_OUT), đá về trang login
    if (event === 'SIGNED_OUT') {
      router.push('/login')
    }

    // Nếu vừa đăng nhập thành công (SIGNED_IN), đá về dashboard (tuỳ chọn)
    // Lưu ý: Logic này có thể xung đột với router guard nếu không kiểm soát kỹ,
    // nhưng thường dùng để xử lý redirect sau khi verify email/phone.
    if (event === 'SIGNED_IN' && router.currentRoute.value.path === '/login') {
      router.push('/dashboard')
    }
  })
})
</script>

<style scoped>
/* Global styles nếu cần */
</style>
