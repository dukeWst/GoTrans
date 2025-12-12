<template>
  <section class="py-16 px-24">
    <h2 class="text-3xl font-bold text-center mb-12">Tính năng nổi bật</h2>

    <div class="grid md:grid-cols-3 gap-8">
      <div
        v-for="item in features"
        :key="item.title"
        class="p-6 rounded-2xl shadow-lg bg-gradient-to-br from-emerald-50 to-white hover:shadow-2xl hover:-translate-y-2 transform transition-all duration-300"
      >
        <component :is="item.icon" class="w-12 h-12 text-emerald-500" />

        <h3 class="mt-4 text-xl font-semibold">{{ item.title }}</h3>
        <p class="mt-2 text-slate-600">{{ item.desc }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ShieldCheck, Truck, Map } from 'lucide-vue-next'

const features = [
  {
    icon: ShieldCheck,
    title: 'An toàn tuyệt đối',
    desc: 'Đội ngũ chuyên nghiệp, đảm bảo an toàn cho tài sản.',
  },
  {
    icon: Truck,
    title: 'Vận chuyển nhanh',
    desc: 'Tính toán lộ trình tối ưu, tiết kiệm thời gian.',
  },
  {
    icon: Map,
    title: 'Tính phí minh bạch',
    desc: 'Tính tiền theo khoảng cách thực tế, không phát sinh.',
  },
]
</script>
