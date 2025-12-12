<template>
  <section class="py-20 bg-gradient-to-r from-emerald-100 to-white rounded-xl">
    <h2 class="text-3xl font-bold text-center mb-16">Quy trình hoạt động</h2>

    <div class="relative max-w-4xl mx-auto">
      <!-- timeline line -->
      <div class="absolute top-1/2 w-full h-1 bg-emerald-300"></div>

      <div class="grid grid-cols-3 text-center gap-6 relative">
        <div
          v-for="(step, index) in steps"
          :key="step.title"
          class="relative flex flex-col items-center"
        >
          <div
            class="w-20 h-20 flex items-center justify-center rounded-full bg-white shadow-lg border-2 border-emerald-300 hover:scale-110 transition-all duration-300"
          >
            <component :is="step.icon" class="w-10 h-10 text-emerald-600" />
          </div>

          <h3 class="mt-4 font-semibold text-lg">{{ step.title }}</h3>
          <p class="text-slate-600 mt-1">{{ step.desc }}</p>

          <!-- step indicator -->
          <div
            class="absolute top-1/2 w-3 h-3 rounded-full bg-emerald-500 transform -translate-y-1/2"
            :class="index === 0 ? 'left-10' : index === 2 ? 'right-10' : ''"
          ></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { PhoneCall, ClipboardList, CheckCircle2 } from 'lucide-vue-next'

const steps = [
  { icon: PhoneCall, title: 'Liên hệ', desc: 'Điền thông tin hoặc gọi tổng đài.' },
  { icon: ClipboardList, title: 'Báo giá', desc: 'Hệ thống tính chi phí theo khoảng cách.' },
  { icon: CheckCircle2, title: 'Hoàn tất', desc: 'Tiến hành vận chuyển nhanh chóng.' },
]
</script>
