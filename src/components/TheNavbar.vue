<template>
  <header class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
    <div class="container mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3 cursor-pointer" @click="$router.push('/')">
        <div class="w-16 h-10 rounded-xl text-white flex items-center justify-center">
          <img :src="logo" alt="Logo" class="w-16 h-8" />
        </div>
        <div>
          <div class="font-extrabold text-lg text-slate-800 leading-none">GoTrans</div>
          <div class="text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-1">
            Vận chuyển thông minh
          </div>
        </div>
      </div>

      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
        <RouterLink
          to="/"
          class="hover:text-emerald-600 transition-colors"
          active-class="text-emerald-600 font-bold"
        >
          Trang chủ
        </RouterLink>

        <div class="relative group" ref="dropdownRef">
          <button
            @click="toggleModal"
            class="flex items-center gap-1 hover:text-emerald-600 transition-colors py-2"
            :class="{ 'text-emerald-600 font-bold': serviceOpen }"
          >
            Dịch vụ
            <ChevronDown
              class="w-4 h-4 transition-transform duration-200"
              :class="{ 'rotate-180': serviceOpen }"
            />
          </button>

          <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-2"
          >
            <div
              v-if="serviceOpen"
              class="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden p-2"
            >
              <RouterLink
                to="/services/move"
                class="block px-4 py-3 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition"
                @click="closeModal"
              >
                <div class="font-semibold">Chuyển nhà</div>
                <div class="text-xs text-slate-400 font-normal">Trọn gói & Tháo lắp</div>
              </RouterLink>
              <RouterLink
                to="/services/delivery"
                class="block px-4 py-3 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition"
                @click="closeModal"
              >
                <div class="font-semibold">Giao hàng</div>
                <div class="text-xs text-slate-400 font-normal">Nội thành siêu tốc</div>
              </RouterLink>
            </div>
          </Transition>
        </div>

        <RouterLink
          to="/about"
          class="hover:text-emerald-600 transition-colors"
          active-class="text-emerald-600 font-bold"
        >
          Về chúng tôi
        </RouterLink>
        <RouterLink
          to="/contact"
          class="hover:text-emerald-600 transition-colors"
          active-class="text-emerald-600 font-bold"
        >
          Liên hệ
        </RouterLink>
      </nav>

      <div class="flex items-center gap-3">
        <template v-if="!session">
          <RouterLink
            to="/login"
            class="px-5 py-2.5 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 font-medium transition"
          >
            Đăng nhập
          </RouterLink>
          <RouterLink
            to="/register"
            class="hidden md:inline-flex px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
          >
            Đăng ký
          </RouterLink>
        </template>

        <template v-else>
          <RouterLink
            to="/dashboard"
            class="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition"
          >
            <div
              class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold"
            >
              {{ userInitials }}
            </div>
            <span class="text-sm font-semibold text-slate-700">Dashboard</span>
          </RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { supabase } from '@/supabase'
import logo from '../assets/logo.png'

const serviceOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const session = ref<any>(null)

// Logic xử lý User/Session
const userInitials = computed(() => {
  const name = session.value?.user?.user_metadata?.full_name || 'User'
  return name.charAt(0).toUpperCase()
})

onMounted(async () => {
  // Lấy session ban đầu
  const { data } = await supabase.auth.getSession()
  session.value = data.session

  // Lắng nghe thay đổi auth (đăng nhập/đăng xuất)
  supabase.auth.onAuthStateChange((_event, _session) => {
    session.value = _session
  })

  // Click outside listener
  window.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
})

const toggleModal = (e: Event) => {
  e.stopPropagation() // Ngăn chặn sự kiện click lan ra window ngay lập tức
  serviceOpen.value = !serviceOpen.value
}

const closeModal = () => {
  serviceOpen.value = false
}

const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    serviceOpen.value = false
  }
}
</script>
