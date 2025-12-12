<script setup lang="ts">
import Logo from '@/assets/logo.vue'
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
      <div class="flex flex-col gap-0 items-center">
        <RouterLink to="/">
          <Logo />
        </RouterLink>
        <h2 class="text-2xl font-bold text-center text-gray-800">Đăng ký tài khoản</h2>

        <p class="text-sm text-center text-gray-500 mt-1">Tạo tài khoản GoTrans mới</p>
      </div>

      <form class="mt-6 space-y-4">
        <div>
          <label class="text-sm font-medium">Họ và tên</label>
          <input
            type="text"
            class="mt-1 w-full bg-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Nhập họ tên"
          />
        </div>

        <div>
          <label class="text-sm font-medium">Email</label>
          <input
            type="email"
            class="mt-1 w-full bg-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Nhập email"
          />
        </div>

        <div>
          <label class="text-sm font-medium">Số điện thoại</label>
          <input
            type="tel"
            class="mt-1 w-full bg-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Nhập số điện thoại"
          />
        </div>

        <div>
          <label class="text-sm font-medium">Mật khẩu</label>
          <input
            type="password"
            class="mt-1 w-full bg-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Tạo mật khẩu"
          />
        </div>

        <button
          class="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 transition"
        >
          Đăng ký
        </button>
      </form>

      <p class="text-center text-gray-600 mt-6 text-sm">
        Đã có tài khoản?
        <RouterLink to="/login" class="text-emerald-600 font-medium hover:underline">
          Đăng nhập ngay
        </RouterLink>
      </p>
    </div>
  </div>
</template>
