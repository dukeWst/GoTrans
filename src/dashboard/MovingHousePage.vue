<script setup lang="ts">
import { ref } from 'vue'
import { Truck, MapPin, Calendar, CheckSquare, Home, Sofa } from 'lucide-vue-next'

const form = ref({
  fromAddress: '',
  toAddress: '',
  date: '',
  houseType: 'apartment', // apartment | alley | street
  hasElevator: true,
  items: [] as string[],
})

// Mock list đồ đạc thường gặp
const commonItems = ['Giường ngủ', 'Tủ quần áo', 'Tủ lạnh', 'Máy giặt', 'Sofa', 'Bàn làm việc']

const toggleItem = (item: string) => {
  if (form.value.items.includes(item)) {
    form.value.items = form.value.items.filter((i) => i !== item)
  } else {
    form.value.items.push(item)
  }
}

const handleSubmit = () => {
  alert('Yêu cầu khảo sát đã được gửi!')
}
</script>

<template>
  <main class="flex-1 md:ml-64 p-6 lg:p-10 bg-gray-50 min-h-screen">
    <header class="mb-8">
      <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <Home class="w-6 h-6 text-emerald-600" />
        Dịch vụ Chuyển nhà Trọn gói
      </h2>
      <p class="text-slate-500 mt-1">Đóng gói, vận chuyển và lắp đặt tận nơi.</p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin class="w-5 h-5 text-emerald-600" /> Lộ trình vận chuyển
          </h3>
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-xs font-bold text-slate-500 uppercase">Điểm đi</label>
                <input
                  v-model="form.fromAddress"
                  type="text"
                  placeholder="Nhập địa chỉ nhà cũ"
                  class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs font-bold text-slate-500 uppercase">Điểm đến</label>
                <input
                  v-model="form.toAddress"
                  type="text"
                  placeholder="Nhập địa chỉ nhà mới"
                  class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label class="text-sm font-medium text-slate-700 mb-2 block">Loại nhà</label>
                <select
                  v-model="form.houseType"
                  class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                >
                  <option value="apartment">Chung cư</option>
                  <option value="alley">Nhà trong ngõ</option>
                  <option value="street">Nhà mặt phố</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium text-slate-700 mb-2 block">Ngày chuyển</label>
                <div class="relative">
                  <Calendar class="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    v-model="form.date"
                    type="date"
                    class="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none text-slate-600"
                  />
                </div>
              </div>
              <div class="flex items-center pt-6">
                <label class="flex items-center cursor-pointer gap-3">
                  <div class="relative">
                    <input type="checkbox" v-model="form.hasElevator" class="sr-only peer" />
                    <div
                      class="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 transition-colors"
                    ></div>
                    <div
                      class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"
                    ></div>
                  </div>
                  <span class="text-sm font-medium text-slate-700">Có thang máy</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Sofa class="w-5 h-5 text-emerald-600" /> Đồ đạc chính cần chuyển
          </h3>
          <p class="text-sm text-slate-500 mb-4">
            Vui lòng chọn các đồ đạc lớn để chúng tôi ước lượng loại xe phù hợp.
          </p>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              v-for="item in commonItems"
              :key="item"
              @click="toggleItem(item)"
              :class="[
                'p-3 rounded-xl border text-sm font-medium transition flex items-center justify-between',
                form.items.includes(item)
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 hover:border-emerald-300 text-slate-600',
              ]"
            >
              {{ item }}
              <CheckSquare v-if="form.items.includes(item)" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div
          class="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-xl"
        >
          <h3 class="font-bold text-lg mb-2">Ưu đãi hôm nay!</h3>
          <p class="text-emerald-100 text-sm mb-4">
            Giảm ngay 20% cho đơn chuyển nhà trọn gói đặt trước 3 ngày.
          </p>
          <div
            class="bg-white/20 p-3 rounded-lg text-center backdrop-blur-sm border border-white/30"
          >
            <span class="font-mono font-bold tracking-widest text-lg">MOVENOW20</span>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 class="font-bold text-lg mb-4">Tổng kết sơ bộ</h3>
          <ul class="space-y-3 mb-6">
            <li class="flex items-start gap-3 text-sm text-slate-600">
              <CheckSquare class="w-4 h-4 text-emerald-500 mt-0.5" />
              <span>Loại xe dự kiến: <strong>Xe tải 1.25 Tấn</strong></span>
            </li>
            <li class="flex items-start gap-3 text-sm text-slate-600">
              <CheckSquare class="w-4 h-4 text-emerald-500 mt-0.5" />
              <span>Nhân công bốc xếp: <strong>2 người</strong></span>
            </li>
          </ul>

          <button
            @click="handleSubmit"
            class="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
          >
            Đặt khảo sát miễn phí
          </button>
          <p class="text-center text-xs text-slate-400 mt-3">Chúng tôi sẽ gọi lại trong 5 phút</p>
        </div>
      </div>
    </div>
  </main>
</template>
