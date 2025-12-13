<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase'

const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  error.value = ''
  try {
    loading.value = true
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/dashboard')
  } catch (err: any) {
    error.value = 'Email hoặc mật khẩu không đúng'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen grid grid-cols-1 lg:grid-cols-2">
    <!-- LEFT -->
    <div class="flex flex-col justify-center px-10 lg:px-20 bg-white">
      <div class="max-w-md w-full">
        <div class="mb-12">
          <h1 class="text-4xl font-bold text-gray-900">Đăng nhập GoTrans</h1>
          <p class="text-gray-500 mt-3">Chào mừng quay lại</p>
        </div>

        <form class="space-y-7" @submit.prevent="handleLogin">
          <div>
            <label class="text-sm text-gray-600">Email</label>
            <input
              v-model="email"
              type="email"
              class="w-full border-b border-gray-300 py-2 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label class="text-sm text-gray-600">Mật khẩu</label>
            <input
              v-model="password"
              type="password"
              class="w-full border-b border-gray-300 py-2 outline-none focus:border-emerald-500"
            />
          </div>

          <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

          <button
            :disabled="loading"
            class="w-full bg-gradient-to-r from-emerald-500 to-sky-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
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

    <!-- RIGHT ART -->
    <div
      class="hidden lg:flex items-center justify-center bg-gradient-to-br from-sky-500 via-teal-500 to-emerald-500"
    >
      <h2 class="text-4xl font-bold text-white">GoTrans Dashboard</h2>
    </div>
  </div>
</template>
