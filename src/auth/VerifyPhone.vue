<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import { ArrowLeft } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

// Lấy số điện thoại từ URL, nếu không có thì để chuỗi rỗng
const phone = (route.query.phone as string) || ''
const token = ref('')
const loading = ref(false)
const error = ref('')
const resendLoading = ref(false)
const resendMessage = ref('')

// Format số điện thoại để hiển thị đẹp hơn (VD: +849... -> 09...)
const displayPhone = computed(() => {
  if (!phone) return 'số điện thoại của bạn'
  return phone.replace('+84', '0')
})

const verify = async () => {
  error.value = ''
  if (!token.value || token.value.length < 6) {
    error.value = 'Vui lòng nhập đủ 6 số OTP.'
    return
  }

  try {
    loading.value = true

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: token.value,
      type: 'sms',
    })

    if (verifyError) throw verifyError

    // Xác thực thành công -> Vào Dashboard
    router.push('/dashboard')
  } catch (err: any) {
    error.value = err.message || 'Mã xác thực không đúng hoặc đã hết hạn.'
  } finally {
    loading.value = false
  }
}

const resendOtp = async () => {
  resendMessage.value = ''
  error.value = ''
  try {
    resendLoading.value = true
    const { error: resendError } = await supabase.auth.signInWithOtp({
      phone: phone,
    })

    if (resendError) throw resendError

    resendMessage.value = 'Đã gửi lại mã OTP thành công!'
  } catch (err: any) {
    error.value = err.message || 'Không thể gửi lại mã lúc này.'
  } finally {
    resendLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen relative grid grid-cols-1 lg:grid-cols-2">
    <div class="flex flex-col justify-center px-10 lg:px-20 bg-white">
      <div class="max-w-md w-full mx-auto">
        <button
          @click="router.push('/register')"
          class="inline-flex cursor-pointer items-center text-gray-500 hover:text-gray-900 mb-8 transition"
        >
          <ArrowLeft class="w-5 h-5 mr-2" />
          Quay lại đăng ký
        </button>

        <div class="mb-10">
          <h1 class="text-4xl font-bold text-gray-900 leading-tight">Xác thực tài khoản</h1>
          <p class="text-gray-500 mt-4 text-lg">
            Nhập mã OTP gồm 6 số đã được gửi đến <br />
            <span class="font-bold text-gray-800">{{ displayPhone }}</span>
          </p>
        </div>

        <form class="space-y-8" @submit.prevent="verify">
          <div>
            <label
              class="block text-sm font-medium text-gray-600 mb-2 uppercase tracking-wider text-center"
            >
              Mã xác thực
            </label>
            <input
              v-model="token"
              type="text"
              maxlength="6"
              placeholder="000000"
              class="w-full border-b-2 border-gray-300 py-4 text-center text-4xl font-bold tracking-[1em] text-gray-800 outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-200 placeholder:tracking-normal"
            />
          </div>

          <div
            v-if="error"
            class="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-lg flex items-center"
          >
            ⚠️ {{ error }}
          </div>
          <div
            v-if="resendMessage"
            class="bg-emerald-50 text-emerald-600 text-sm px-4 py-3 rounded-lg flex items-center"
          >
            ✅ {{ resendMessage }}
          </div>

          <button
            :disabled="loading"
            class="w-full bg-gradient-to-r from-emerald-500 to-sky-500 text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50 shadow-lg shadow-emerald-500/30"
          >
            {{ loading ? 'Đang xác thực...' : 'Xác nhận' }}
          </button>
        </form>

        <div class="mt-10 text-center">
          <p class="text-gray-500 mb-2">Bạn không nhận được mã?</p>
          <button
            @click="resendOtp"
            :disabled="resendLoading"
            class="text-emerald-600 font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {{ resendLoading ? 'Đang gửi lại...' : 'Gửi lại mã OTP' }}
          </button>
        </div>
      </div>
    </div>

    <div
      class="relative hidden lg:flex items-center justify-center bg-gradient-to-br from-sky-500 via-teal-500 to-emerald-500 overflow-hidden"
    >
      <div
        class="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white/10 backdrop-blur-2xl shadow-2xl mix-blend-overlay animate-pulse"
      ></div>
      <div
        class="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-white/10 backdrop-blur-3xl shadow-2xl mix-blend-overlay"
      ></div>

      <div class="relative z-10 text-center px-12">
        <div
          class="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-xl shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 class="text-4xl font-bold text-white leading-snug">
          Bảo mật tối đa <br />
          <span class="text-white/90">An tâm vận chuyển</span>
        </h2>
        <p class="text-white/80 mt-6 max-w-md mx-auto text-lg">
          Hệ thống xác thực 2 lớp giúp bảo vệ tài khoản và thông tin đơn hàng của bạn tuyệt đối an
          toàn.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ẩn nút tăng giảm số mặc định của input type number/tel nếu có */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
