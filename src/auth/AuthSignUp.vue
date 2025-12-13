<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import Logo from '@/assets/logo.vue'

const router = useRouter()

const fullName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const agree = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

const handleRegister = async () => {
  error.value = ''
  success.value = ''

  if (!agree.value) {
    error.value = 'Bạn phải đồng ý với điều khoản sử dụng'
    return
  }

  try {
    loading.value = true

    // 1. Tạo tài khoản Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    )

    const user = userCredential.user

    // 2. Update display name
    await updateProfile(user, {
      displayName: fullName.value,
    })

    // 3. Lưu thông tin user vào Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      fullName: fullName.value,
      email: email.value,
      phone: phone.value,
      role: 'customer',
      createdAt: new Date(),
    })

    success.value = 'Đăng ký thành công 🎉'
    setTimeout(() => router.push('/login'), 1500)
  } catch (err: any) {
    error.value = err.message || 'Đăng ký thất bại'
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
          <h1 class="text-4xl font-bold text-gray-900">Tạo tài khoản GoTrans</h1>
          <p class="text-gray-500 mt-3">
            Bắt đầu quản lý dịch vụ vận chuyển thông minh
          </p>
        </div>

        <form class="space-y-7" @submit.prevent="handleRegister">
          <div>
            <label class="block text-sm text-gray-600 mb-1">Họ và tên</label>
            <input
              v-model="fullName"
              type="text"
              class="w-full border-b border-gray-300 py-2 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label class="block text-sm text-gray-600 mb-1">Email</label>
            <input
              v-model="email"
              type="email"
              class="w-full border-b border-gray-300 py-2 focus:border-sky-500 outline-none"
            />
          </div>

          <div>
            <label class="block text-sm text-gray-600 mb-1">Số điện thoại</label>
            <input
              v-model="phone"
              type="tel"
              class="w-full border-b border-gray-300 py-2 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label class="block text-sm text-gray-600 mb-1">Mật khẩu</label>
            <input
              v-model="password"
              type="password"
              class="w-full border-b border-gray-300 py-2 focus:border-sky-500 outline-none"
            />
          </div>

          <div class="flex items-center gap-3">
            <input type="checkbox" v-model="agree" />
            <span class="text-sm text-gray-600">
              Tôi đồng ý với
              <a class="text-emerald-600 hover:underline">điều khoản sử dụng</a>
            </span>
          </div>

          <!-- Error -->
          <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
          <p v-if="success" class="text-emerald-600 text-sm">{{ success }}</p>

          <button
            :disabled="loading"
            class="w-full bg-gradient-to-r from-emerald-500 to-sky-500
                   text-white py-3 rounded-xl font-semibold
                   hover:opacity-90 transition disabled:opacity-50"
          >
            {{ loading ? 'Đang tạo tài khoản...' : 'Đăng ký' }}
          </button>
        </form>

        <p class="mt-10 text-sm text-gray-500">
          Đã có tài khoản?
          <RouterLink to="/login" class="text-emerald-600 hover:underline">
            Đăng nhập ngay
          </RouterLink>
        </p>
      </div>
    </div>

    <!-- RIGHT ART (giữ nguyên UI của bạn) -->
    <div
      class="relative hidden lg:flex items-center justify-center
             bg-gradient-to-br from-sky-500 via-teal-500 to-emerald-500 overflow-hidden"
    >
      <div class="absolute top-24 left-20 w-48 h-48 bg-white/20 rounded-2xl blur-xl"></div>
      <div class="absolute bottom-20 right-16 w-64 h-64 bg-white/10 rounded-3xl blur-2xl"></div>

      <div class="relative z-10 text-center px-12">
        <h2 class="text-4xl font-bold text-white">
          Bắt đầu hành trình <br />
          <span class="text-white/90">cùng GoTrans</span>
        </h2>
      </div>
    </div>
  </div>
</template>
