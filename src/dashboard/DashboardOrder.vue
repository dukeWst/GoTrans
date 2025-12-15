<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Package, Truck, Calendar, Clock, ChevronRight, Search } from 'lucide-vue-next'

// --- MOCK DATA (Dữ liệu giả lập) ---
// Sau này bạn sẽ thay thế phần này bằng fetch từ Supabase
const mockOrders = [
  {
    id: 'DH-7382',
    serviceType: 'delivery', // delivery | moving
    status: 'completed', // processing | completed | cancelled
    date: '15/12/2023',
    time: '14:30',
    price: 150000,
    from: '123 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    to: '45 Láng Hạ, Đống Đa, Hà Nội',
  },
  {
    id: 'DH-9921',
    serviceType: 'moving',
    status: 'processing',
    date: '16/12/2023',
    time: '09:00',
    price: 1200000,
    from: 'Cầu Giấy, Hà Nội',
    to: 'Ecopark, Hưng Yên',
  },
  {
    id: 'DH-1102',
    serviceType: 'delivery',
    status: 'cancelled',
    date: '10/12/2023',
    time: '18:15',
    price: 55000,
    from: 'Royal City, Hà Nội',
    to: 'Times City, Hà Nội',
  },
  {
    id: 'DH-3321',
    serviceType: 'delivery',
    status: 'completed',
    date: '05/12/2023',
    time: '10:00',
    price: 85000,
    from: 'Hồ Gươm Plaza',
    to: 'Aeon Mall Hà Đông',
  },
]

// State
const loading = ref(false)
const activeFilter = ref('all')
const searchQuery = ref('')
const orders = ref(mockOrders)

// Filter Logic
const filteredOrders = computed(() => {
  return orders.value.filter((order) => {
    // Lọc theo tab trạng thái
    const statusMatch = activeFilter.value === 'all' || order.status === activeFilter.value
    // Lọc theo tìm kiếm (Mã đơn hoặc địa chỉ)
    const searchLower = searchQuery.value.toLowerCase()
    const searchMatch =
      order.id.toLowerCase().includes(searchLower) ||
      order.from.toLowerCase().includes(searchLower) ||
      order.to.toLowerCase().includes(searchLower)

    return statusMatch && searchMatch
  })
})

// Helper: Format tiền tệ
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

// Helper: Màu sắc trạng thái
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'processing':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// Helper: Label trạng thái
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Hoàn tất'
    case 'processing':
      return 'Đang thực hiện'
    case 'cancelled':
      return 'Đã hủy'
    default:
      return status
  }
}

// Giả lập loading khi vào trang
onMounted(() => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 800)
})
</script>

<template>
  <main class="flex-1 md:ml-64 p-4 lg:p-10 bg-slate-50 min-h-screen">
    <header
      class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
    >
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Lịch sử hoạt động</h2>
        <p class="text-slate-500 mt-1">Xem lại các đơn hàng vận chuyển và chuyển nhà.</p>
      </div>

      <div class="relative w-full md:w-auto">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Tìm mã đơn, địa chỉ..."
          class="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white shadow-sm"
        />
      </div>
    </header>

    <div class="mb-6 overflow-x-auto pb-2 scrollbar-hide">
      <div class="flex gap-2 min-w-max">
        <button
          v-for="tab in [
            { id: 'all', label: 'Tất cả' },
            { id: 'processing', label: 'Đang thực hiện' },
            { id: 'completed', label: 'Hoàn tất' },
            { id: 'cancelled', label: 'Đã hủy' },
          ]"
          :key="tab.id"
          @click="activeFilter = tab.id"
          class="px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 border"
          :class="
            activeFilter === tab.id
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
              : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50'
          "
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
      <p class="text-slate-400 text-sm">Đang tải dữ liệu...</p>
    </div>

    <div
      v-else-if="filteredOrders.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-dashed border-gray-300"
    >
      <div class="bg-gray-50 p-4 rounded-full mb-4">
        <Package class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-bold text-slate-900">Không tìm thấy đơn hàng</h3>
      <p class="text-slate-500 max-w-xs mx-auto mt-2">
        Bạn chưa có đơn hàng nào hoặc không tìm thấy kết quả phù hợp.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <div
        v-for="item in filteredOrders"
        :key="item.id"
        class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
      >
        <div class="flex justify-between items-start mb-4">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="
                item.serviceType === 'delivery'
                  ? 'bg-orange-50 text-orange-600'
                  : 'bg-purple-50 text-purple-600'
              "
            >
              <Package v-if="item.serviceType === 'delivery'" class="w-5 h-5" />
              <Truck v-else class="w-5 h-5" />
            </div>
            <div>
              <h4 class="font-bold text-slate-800 text-sm md:text-base">
                {{ item.serviceType === 'delivery' ? 'Giao hàng nhanh' : 'Chuyển nhà' }}
              </h4>
              <span class="text-xs text-slate-500 font-mono">#{{ item.id }}</span>
            </div>
          </div>
          <span
            class="px-3 py-1 rounded-full text-xs font-bold border capitalize"
            :class="getStatusColor(item.status)"
          >
            {{ getStatusLabel(item.status) }}
          </span>
        </div>

        <div class="relative pl-4 border-l-2 border-gray-100 space-y-4 ml-2 mb-4">
          <div class="relative">
            <div
              class="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-white border-2 border-emerald-500"
            ></div>
            <p class="text-xs text-slate-500 mb-0.5">Điểm đi</p>
            <p class="text-sm font-medium text-slate-800 line-clamp-1">{{ item.from }}</p>
          </div>
          <div class="relative">
            <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-emerald-500"></div>
            <p class="text-xs text-slate-500 mb-0.5">Điểm đến</p>
            <p class="text-sm font-medium text-slate-800 line-clamp-1">{{ item.to }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-gray-50">
          <div class="flex items-center gap-4 text-xs text-slate-500">
            <div class="flex items-center gap-1">
              <Calendar class="w-3.5 h-3.5" />
              {{ item.date }}
            </div>
            <div class="flex items-center gap-1">
              <Clock class="w-3.5 h-3.5" />
              {{ item.time }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-emerald-600">{{ formatCurrency(item.price) }}</span>
            <ChevronRight
              class="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform"
            />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Ẩn scrollbar cho tab filter trên mobile */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
<script lang="ts"></script>
