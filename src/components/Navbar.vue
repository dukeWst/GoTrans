<template>
  <header class="bg-white shadow-sm">
    <div class="container mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-md flex items-center justify-center">
          <Logo />
        </div>
        <div>
          <div class="font-bold text-lg">GoTrans</div>
          <div class="text-xs text-slate-500">Chuyển nhà nhanh — An tâm</div>
        </div>
      </div>

      <nav class="hidden md:flex items-center gap-6 text-sm">
        <RouterLink to="/" class="hover:text-emerald-600">Trang chủ</RouterLink>
        <RouterLink to="/services" class="hover:text-emerald-600">Dịch vụ</RouterLink>
        <RouterLink to="/about" class="hover:text-emerald-600">Về chúng tôi</RouterLink>
        <RouterLink to="/contact" class="hover:text-emerald-600">Liên hệ</RouterLink>
      </nav>

      <div class="flex items-center gap-3">
        <button
          class="px-4 py-2 rounded-md border border-emerald-500 text-emerald-500 hover:bg-emerald-50"
        >
          Đăng nhập
        </button>
        <button
          class="hidden md:inline-block bg-emerald-500 text-white px-4 py-2 rounded-md shadow"
        >
          Đăng ký
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import Logo from '@/assets/logo.vue'
import type { RouterLink } from 'vue-router'
</script>
