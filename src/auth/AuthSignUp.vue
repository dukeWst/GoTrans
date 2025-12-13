<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import { X } from 'lucide-vue-next'

const router = useRouter()

// State
const fullName = ref('')
const phone = ref('')
const password = ref('')
const agreed = ref(false)
const loading = ref(false)
const error = ref('')

// Hàm chuẩn hóa số điện thoại (VN -> E.164)
const formatPhone = (phoneStr: string) => {
  // Xóa ký tự không phải số
  let cleaned = phoneStr.replace(/\D/g, '')
  // Nếu bắt đầu bằng 0, thay bằng 84. Nếu chưa có 84 thì thêm vào.
  if (cleaned.startsWith('0')) {
    cleaned = '84' + cleaned.slice(1)
  } else if (!cleaned.startsWith('84')) {
    cleaned = '84' + cleaned
  }
  return '+' + cleaned
}

const handleRegister = async () => {
  console.log('1. Bắt đầu hàm đăng ký') // <--- LOG 1
  error.value = ''

  if (!fullName.value || !phone.value || !password.value) {
    console.log('Lỗi: Thiếu thông tin')
    error.value = 'Vui lòng điền đầy đủ thông tin.'
    return
  }

  try {
    loading.value = true
    const formattedPhone = formatPhone(phone.value)

    console.log('2. Số điện thoại sau khi format:', formattedPhone) // <--- LOG 2

    // Gọi Supabase
    console.log('3. Đang gọi supabase.auth.signUp...') // <--- LOG 3

    const { data, error: apiError } = await supabase.auth.signUp({
      phone: formattedPhone,
      password: password.value,
      options: { data: { full_name: fullName.value } },
    })

    console.log('4. Kết quả trả về từ Supabase:', data, apiError) // <--- LOG 4 QUAN TRỌNG

    if (apiError) throw apiError

    console.log('5. Thành công! Chuyển trang...')
    router.push({ path: '/verify-phone', query: { phone: formattedPhone } })
  } catch (err: any) {
    console.error('6. CÓ LỖI XẢY RA:', err) // <--- LOG 5
    error.value = err.message
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
          <h1 class="text-4xl font-bold text-gray-900 leading-tight">Tạo tài khoản GoTrans</h1>
          <p class="text-gray-500 mt-3">Đăng ký bằng số điện thoại để sử dụng dịch vụ</p>
        </div>

        <form class="space-y-7" @submit.prevent="handleRegister">
          <div>
            <label class="block text-sm text-gray-600 mb-1">Họ và tên</label>
            <input
              v-model="fullName"
              type="text"
              placeholder="Nguyễn Văn A"
              class="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label class="block text-sm text-gray-600 mb-1">Số điện thoại</label>
            <input
              v-model="phone"
              type="tel"
              placeholder="0912 345 678"
              class="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label class="block text-sm text-gray-600 mb-1">Mật khẩu</label>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              class="w-full border-b border-gray-300 py-2 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div class="flex items-center gap-3">
            <input v-model="agreed" type="checkbox" id="terms" class="cursor-pointer" />
            <label for="terms" class="text-sm text-gray-600 cursor-pointer">
              Tôi đồng ý với
              <a class="text-emerald-600 hover:underline"> điều khoản sử dụng </a>
            </label>
          </div>

          <p v-if="error" class="text-red-500 text-sm italic">{{ error }}</p>

          <button
            :disabled="loading"
            class="w-full bg-gradient-to-r from-emerald-500 to-sky-500 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {{ loading ? 'Đang xử lý...' : 'Đăng ký' }}
          </button>
        </form>

        <p class="mt-10 text-sm text-gray-500">
          Đã có tài khoản?
          <RouterLink to="/login" class="text-emerald-600 font-medium hover:underline">
            Đăng nhập ngay
          </RouterLink>
        </p>
      </div>
    </div>

    <div
      class="relative hidden lg:flex items-center justify-center bg-gradient-to-br from-sky-500 via-teal-500 to-emerald-500 overflow-hidden"
    >
      <div
        class="absolute top-24 left-20 w-48 h-48 rounded-2xl bg-white/20 backdrop-blur-xl shadow-xl rotate-6"
      ></div>
      <div
        class="absolute bottom-20 right-16 w-64 h-64 rounded-3xl bg-white/10 backdrop-blur-2xl shadow-2xl -rotate-12"
      ></div>
      <div class="relative z-10 text-center px-12">
        <h2 class="text-4xl font-bold text-white leading-snug">
          Bắt đầu hành trình <br />
          <span class="text-white/90">cùng GoTrans</span>
        </h2>
        <p class="text-white/80 mt-4 max-w-md mx-auto">
          Chuyển nhà, giao hàng và vận chuyển nhanh chóng – minh bạch – an toàn
        </p>
      </div>
    </div>
  </div>
</template>
