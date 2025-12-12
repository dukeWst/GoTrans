<template>
  <section class="py-20 px-24 bg-gradient-to-b from-white to-emerald-50">
    <h2 class="text-3xl font-bold text-center mb-12">Dịch vụ của chúng tôi</h2>

    <div class="space-y-12">
      <div
        v-for="(item, index) in services"
        :key="item.title"
        :class="[
          'grid md:grid-cols-2 gap-10 items-center',
          index % 2 === 1 ? 'md:flex-row-reverse' : '',
        ]"
      >
        <div class="p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300">
          <component :is="item.icon" class="w-12 h-12 text-emerald-500 mb-4" />
          <h3 class="text-xl font-semibold">{{ item.title }}</h3>
          <p class="text-slate-600 mt-2">{{ item.desc }}</p>
        </div>

        <img :src="item.img" class="rounded-2xl shadow-md h-64 w-9/10 object-contain" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { Boxes, PackageCheck, Car } from 'lucide-vue-next'
import photo1 from '@/assets/photo_1.png'
import photo2 from '@/assets/photo_2.png'
import photo3 from '@/assets/photo_3.png'

const services = [
  {
    icon: Boxes,
    title: 'Chuyển nhà',
    desc: 'Đóng gói – tháo lắp – vận chuyển nhanh chóng.',
    img: photo1,
  },
  {
    icon: Car,
    title: 'Vận chuyển hàng hóa',
    desc: 'Nhận giao đồ cồng kềnh, vận chuyển nội thành.',
    img: photo2,
  },
  {
    icon: PackageCheck,
    title: 'Dịch vụ trọn gói',
    desc: 'Bao gồm mọi quy trình, giúp bạn rảnh tay hoàn toàn.',
    img: photo3,
  },
]
</script>
