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

      <nav class="hidden md:flex items-center gap-12 text-sm relative">
        <RouterLink to="/" class="hover:text-emerald-600 font-bold text-gray-600"
          >Trang chủ</RouterLink
        >

        <div class="relative">
          <button
            @click.stop="toggleModal"
            :class="serviceOpen ? 'text-emerald-600' : 'text-gray-600'"
            class="cursor-pointer transition font-bold hover:text-emerald-600 flex items-center gap-2"
          >
            Dịch vụ
            <ChevronUp v-if="serviceOpen" class="w-4 h-4" />
            <ChevronDown v-else class="w-4 h-4" />
          </button>

          <!-- MODAL DROPDOWN -->
          <div
            v-if="serviceOpen"
            class="service-menu absolute left-1/2 -translate-x-1/2 top-12 w-48 text-center bg-white shadow-xl rounded-b-lg pb-2 z-50"
          >
            <RouterLink
              to="/services/move"
              class="block px-4 py-2 rounded hover:bg-emerald-50 hover:text-emerald-600 w-full"
              @click="closeModal"
            >
              Dịch vụ chuyển đồ
            </RouterLink>

            <RouterLink
              to="/services/delivery"
              class="block px-4 py-2 rounded hover:bg-emerald-50 hover:text-emerald-600"
              @click="closeModal"
            >
              Dịch vụ giao hàng
            </RouterLink>
          </div>
        </div>

        <RouterLink to="/about" class="hover:text-emerald-600 text-gray-600 font-bold"
          >Về chúng tôi</RouterLink
        >
        <RouterLink to="/contact" class="hover:text-emerald-600 text-gray-600 font-bold"
          >Liên hệ</RouterLink
        >
      </nav>

      <div class="flex items-center gap-3">
        <RouterLink
          to="/login"
          class="px-4 py-2 rounded-md border border-emerald-500 text-emerald-500 hover:bg-emerald-50"
        >
          Đăng nhập
        </RouterLink>
        <RouterLink
          to="/register"
          class="hidden md:inline-block bg-emerald-500 text-white px-4 py-2 rounded-md shadow"
        >
          Đăng ký
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import Logo from '@/assets/logo.vue'
import type { RouterLink } from 'vue-router'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import { R } from 'vue-router/dist/router-CWoNjPRp.mjs'

const serviceOpen = ref(false)

const toggleModal = () => {
  serviceOpen.value = !serviceOpen.value
}

const closeModal = () => {
  serviceOpen.value = false
}

// đóng modal khi click ra ngoài
const handleClickOutside = (e: MouseEvent) => {
  const menu = document.querySelector('.service-menu')
  if (!menu?.contains(e.target as Node)) {
    serviceOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>
