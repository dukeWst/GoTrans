<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import { X } from 'lucide-vue-next'

const router = useRouter()

// State
const phone = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

// Hàm chuẩn hóa số điện thoại (Giống bên SignUp)
const formatPhone = (phoneStr: string) => {
  let cleaned = phoneStr.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '84' + cleaned.slice(1)
  } else if (!cleaned.startsWith('84')) {
    cleaned = '84' + cleaned
  }
  return '+' + cleaned
}

const login = async () => {
  error.value = ''

  if (!phone.value || !password.value) {
    error.value = 'Vui lòng nhập số điện thoại và mật khẩu.'
    return
  }

  try {
    loading.value = true

    // 1. Format số điện thoại trước khi gửi
    const formattedPhone = formatPhone(phone.value)

    // 2. Gọi Supabase Login
    const { error: loginError } = await supabase.auth.signInWithPassword({
      phone: formattedPhone,
      password: password.value,
    })

    if (loginError) throw loginError

    // 3. Thành công -> Vào dashboard
    router.push('/dashboard')
  } catch (err: any) {
    // Xử lý thông báo lỗi cho thân thiện
    if (err.message.includes('Invalid login credentials')) {
      error.value = 'Sai số điện thoại hoặc mật khẩu.'
    } else {
      error.value = err.message || 'Đăng nhập thất bại.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen relative grid grid-cols-1 lg:grid-cols-2">
    <div class="flex flex-col justify-center px-10 lg:px-20 bg-white">
      <div class="max-w-md w-full">
        <RouterLink to="/" class="inline-block mb-6">
          <X class="absolute top-10 left-10" />
        </RouterLink>

        <div class="mb-12">
          <h1 class="text-4xl font-bold text-gray-900">Đăng nhập GoTrans</h1>
          <p class="text-gray-500 mt-3">Chào mừng quay lại</p>
        </div>

        <form class="space-y-7" @submit.prevent="login">
          <div>
            <label class="text-sm text-gray-600">Số điện thoại</label>
            <input
              v-model="phone"
              type="tel"
              placeholder="0912 345 678"
              class="w-full border-b border-gray-300 py-2 outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label class="text-sm text-gray-600">Mật khẩu</label>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="w-full border-b border-gray-300 py-2 outline-none focus:border-emerald-500 transition"
            />
          </div>

          <p v-if="error" class="text-red-500 text-sm italic">{{ error }}</p>

          <button
            :disabled="loading"
            class="w-full bg-gradient-to-r from-emerald-500 to-sky-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50 hover:opacity-90 transition"
          >
            {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
          </button>
        </form>

        <p class="mt-10 text-sm text-gray-500">
          Chưa có tài khoản?
          <RouterLink to="/register" class="text-emerald-600 hover:underline"> Đăng ký </RouterLink>
        </p>
      </div>
    </div>

    <div
      class="relative hidden lg:flex items-center justify-center overflow-hidden bg-gradient-to-br from-sky-500 via-teal-500 to-emerald-500"
    >
      <div
        class="absolute top-16 left-20 w-56 h-56 rounded-3xl bg-white/20 backdrop-blur-2xl rotate-12 shadow-2xl"
      ></div>
      <div
        class="absolute bottom-20 right-24 w-72 h-72 rounded-full bg-white/10 backdrop-blur-3xl -rotate-12"
      ></div>
      <div class="relative z-10 text-center px-12">
        <h2 class="text-4xl font-bold text-white leading-snug">
          Quản lý vận chuyển <br />
          <span class="text-white/90">nhanh & thông minh</span>
        </h2>
        <p class="text-white/80 mt-4 max-w-md mx-auto">
          Theo dõi đơn hàng, tối ưu chi phí và quản lý lộ trình chỉ trong một nền tảng duy nhất.
        </p>
      </div>
    </div>
  </div>
</template>
