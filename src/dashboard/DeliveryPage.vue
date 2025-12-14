<script setup lang="ts">
import { ref, computed } from 'vue'
import { MapPin, Package, Truck, Phone, User, Weight, DollarSign } from 'lucide-vue-next'

const form = ref({
  senderName: '',
  senderPhone: '',
  pickupAddress: '',
  receiverName: '',
  receiverPhone: '',
  dropoffAddress: '',
  weight: 1,
  note: '',
  type: 'standard', // standard | express
})

// Mock tính giá tiền tự động
const estimatedPrice = computed(() => {
  const basePrice = 15000
  const weightPrice = form.value.weight * 5000
  const expressFee = form.value.type === 'express' ? 20000 : 0
  return (basePrice + weightPrice + expressFee).toLocaleString('vi-VN')
})

const handleSubmit = () => {
  alert('Đang tìm tài xế gần bạn...')
}
</script>

<template>
  <main class="flex-1 md:ml-64 p-6 lg:p-10 bg-gray-50 min-h-screen">
    <header class="mb-8">
      <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <Package class="w-6 h-6 text-emerald-600" />
        Dịch vụ Giao hàng
      </h2>
      <p class="text-slate-500 mt-1">Giao hàng nhanh nội thành & liên tỉnh.</p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            <div
              class="hidden md:block absolute left-1/2 top-10 bottom-10 w-px bg-gray-100 -translate-x-1/2"
            ></div>

            <div class="space-y-4">
              <h3 class="font-bold text-slate-800 flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                Điểm lấy hàng
              </h3>
              <div class="space-y-3">
                <div class="relative">
                  <User class="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    v-model="form.senderName"
                    type="text"
                    placeholder="Tên người gửi"
                    class="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
                <div class="relative">
                  <Phone class="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    v-model="form.senderPhone"
                    type="tel"
                    placeholder="SĐT người gửi"
                    class="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
                <div class="relative">
                  <MapPin class="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <textarea
                    v-model="form.pickupAddress"
                    rows="2"
                    placeholder="Địa chỉ lấy hàng"
                    class="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <h3 class="font-bold text-slate-800 flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-orange-500"></div>
                Điểm giao hàng
              </h3>
              <div class="space-y-3">
                <div class="relative">
                  <User class="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    v-model="form.receiverName"
                    type="text"
                    placeholder="Tên người nhận"
                    class="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
                <div class="relative">
                  <Phone class="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    v-model="form.receiverPhone"
                    type="tel"
                    placeholder="SĐT người nhận"
                    class="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
                <div class="relative">
                  <MapPin class="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <textarea
                    v-model="form.dropoffAddress"
                    rows="2"
                    placeholder="Địa chỉ giao hàng"
                    class="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 class="font-bold text-slate-800 mb-4">Thông tin kiện hàng</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-slate-500 mb-1 block">Khối lượng (kg)</label>
              <div class="relative">
                <Weight class="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  v-model="form.weight"
                  type="number"
                  min="1"
                  class="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>
            <div>
              <label class="text-sm font-medium text-slate-500 mb-1 block">Loại dịch vụ</label>
              <select
                v-model="form.type"
                class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition appearance-none"
              >
                <option value="standard">Tiêu chuẩn</option>
                <option value="express">Hỏa tốc (2h)</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="text-sm font-medium text-slate-500 mb-1 block"
                >Ghi chú cho tài xế</label
              >
              <input
                v-model="form.note"
                type="text"
                placeholder="Vd: Hàng dễ vỡ, gọi trước khi giao..."
                class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-6">
          <h3 class="font-bold text-lg mb-4">Tổng chi phí</h3>

          <div class="space-y-3 mb-6 border-b border-gray-100 pb-6">
            <div class="flex justify-between text-slate-500 text-sm">
              <span>Phí cơ bản</span>
              <span>15.000đ</span>
            </div>
            <div class="flex justify-between text-slate-500 text-sm">
              <span>Phí khối lượng ({{ form.weight }}kg)</span>
              <span>{{ (form.weight * 5000).toLocaleString('vi-VN') }}đ</span>
            </div>
            <div
              v-if="form.type === 'express'"
              class="flex justify-between text-emerald-600 text-sm font-medium"
            >
              <span>Phụ phí Hỏa tốc</span>
              <span>20.000đ</span>
            </div>
          </div>

          <div class="flex justify-between items-center mb-6">
            <span class="font-bold text-slate-900">Tổng cộng</span>
            <span class="font-extrabold text-2xl text-emerald-600">{{ estimatedPrice }}đ</span>
          </div>

          <button
            @click="handleSubmit"
            class="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex justify-center items-center gap-2"
          >
            <Truck class="w-5 h-5" /> Đặt xe ngay
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
