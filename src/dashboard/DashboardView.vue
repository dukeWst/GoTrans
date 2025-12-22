<script setup lang="ts">
import { ref, onMounted, onActivated, onUnmounted } from 'vue' // Thêm onActivated
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import { Package, Truck, ChevronRight, Clock, Plus } from 'lucide-vue-next'

const router = useRouter()
const user = ref<any>(null)
const loading = ref(true)

// --- STATE DỮ LIỆU ---
const orders = ref<any[]>([])
const activeOrder = ref<any>(null)
const recentOrders = ref<any[]>([])
const stats = ref({
  total: 0,
  processing: 0,
})

// --- HELPERS ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

const getProgress = (status: string) => {
  switch (status) {
    case 'pending':
      return 10
    case 'processing':
      return 50
    case 'shipping':
      return 80
    case 'completed':
      return 100
    case 'cancelled':
      return 0
    default:
      return 0
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed':
      return 'Hoàn tất'
    case 'shipping':
      return 'Đang thực hiện'
    case 'processing':
      return 'Đang xác nhận'
    case 'cancelled':
      return 'Đã hủy'
    default:
      return status
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'shipping':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'processing':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// --- FETCH DATA ---
const fetchDashboardData = async () => {
  // Lưu ý: Có thể bỏ loading = true ở đây nếu muốn update ngầm không hiện spinner
  // loading.value = true

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    user.value = session.user

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (data) {
      orders.value = data

      // 1. Active Order (Đơn đang xử lý gần nhất)
      const foundActive = data.find(
        (o: any) => o.status === 'processing' || o.status === 'shipping',
      )

      if (foundActive) {
        activeOrder.value = {
          id: foundActive.order_code || foundActive.id.slice(0, 8).toUpperCase(),
          statusLabel: getStatusLabel(foundActive.status),
          status: foundActive.status,
          driver: foundActive.driver_name || 'Đang điều phối',
          vehicle: foundActive.vehicle_info || 'Xe tiêu chuẩn',
          from: foundActive.pickup_address,
          to: foundActive.dropoff_address,
          progress: getProgress(foundActive.status),
          serviceType: ['standard', 'express'].includes(foundActive.service_type)
            ? 'delivery'
            : 'moving',
        }
      } else {
        activeOrder.value = null
      }

      // 2. Recent Orders
      recentOrders.value = data.slice(0, 5).map((item: any) => ({
        id: item.order_code || item.id.slice(0, 8).toUpperCase(),
        date: new Date(item.created_at).toLocaleDateString('vi-VN'),
        type: ['standard', 'express', 'delivery'].includes(item.service_type)
          ? 'Giao hàng'
          : 'Chuyển nhà',
        price: item.total_price || 0,
        status: item.status,
        statusLabel: getStatusLabel(item.status),
      }))

      // 3. Stats
      stats.value = {
        total: data.length,
        processing: data.filter((o: any) => o.status === 'processing').length,
      }
    }
  } catch (err) {
    console.error('Lỗi tải dữ liệu dashboard:', err)
  } finally {
    loading.value = false
  }
}

// --- LIFECYCLE ---
let realtimeChannel: any = null

onMounted(() => {
  fetchDashboardData()

  // Realtime subscription: Tự động cập nhật nếu có thay đổi từ DB (ví dụ mở 2 tab)
  realtimeChannel = supabase
    .channel('dashboard-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      fetchDashboardData()
    })
    .subscribe()
})

// QUAN TRỌNG: Khi quay lại tab này từ OrderList, code này sẽ chạy để lấy số liệu mới
onActivated(() => {
  fetchDashboardData()
})

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex font-sans text-slate-800 w-full">
    <main class="flex-1 md:ml-64 p-6 lg:p-10 w-full transition-all duration-300">
      <header class="flex flex-col md:flex-row justify-between md:items-center mb-10 gap-4">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">
            Xin chào, {{ user?.user_metadata?.full_name || 'Khách hàng' }} 👋
          </h2>
          <p class="text-slate-500 mt-1">Chào mừng quay trở lại với GoTrans.</p>
        </div>
      </header>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div class="xl:col-span-2 space-y-8">
          <div
            v-if="loading"
            class="h-64 bg-white rounded-2xl animate-pulse flex items-center justify-center"
          >
            <div
              class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"
            ></div>
          </div>

          <div
            v-else-if="activeOrder"
            class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group transition-all hover:shadow-2xl"
          >
            <div
              class="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition duration-700"
            ></div>

            <div class="flex justify-between items-start mb-6 relative z-10">
              <div>
                <span
                  class="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30 uppercase tracking-wider animate-pulse"
                >
                  {{ activeOrder.statusLabel }}
                </span>
                <h3 class="text-xl font-bold mt-3 flex items-center gap-2">
                  Đơn hàng #{{ activeOrder.id }}
                </h3>
                <p class="text-slate-400 text-sm mt-1 flex items-center gap-2">
                  Tài xế: <span class="text-white font-medium">{{ activeOrder.driver }}</span> •
                  {{ activeOrder.vehicle }}
                </p>
              </div>
              <div
                class="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/5 shadow-inner"
              >
                <Truck
                  v-if="activeOrder.serviceType === 'moving'"
                  class="w-8 h-8 text-emerald-400"
                />
                <Package v-else class="w-8 h-8 text-orange-400" />
              </div>
            </div>

            <div class="space-y-4 relative z-10 my-6 pl-1">
              <div class="flex gap-4 relative">
                <div class="absolute left-[5.5px] top-3 bottom-0 w-0.5 bg-slate-700 h-full"></div>
                <div class="flex flex-col items-center relative z-10">
                  <div
                    class="w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  ></div>
                </div>
                <div>
                  <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Điểm đi
                  </p>
                  <p class="font-medium text-sm text-slate-100 mt-0.5 line-clamp-1">
                    {{ activeOrder.from }}
                  </p>
                </div>
              </div>

              <div class="flex gap-4 relative z-10 pt-2">
                <div class="flex flex-col items-center">
                  <div class="w-3 h-3 bg-white rounded-full border-2 border-slate-500"></div>
                </div>
                <div>
                  <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Điểm đến
                  </p>
                  <p class="font-medium text-sm text-slate-100 mt-0.5 line-clamp-1">
                    {{ activeOrder.to }}
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-8 relative z-10">
              <div class="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                <span>Tiến độ vận chuyển</span>
                <span class="text-emerald-400">{{ activeOrder.progress }}%</span>
              </div>
              <div class="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                <div
                  class="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  :style="{ width: activeOrder.progress + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <div
            v-else
            class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center h-64 animate-fade-in"
          >
            <div class="bg-emerald-50 p-4 rounded-full mb-4">
              <Truck class="w-8 h-8 text-emerald-600" />
            </div>
            <h3 class="text-lg font-bold text-slate-900">Bạn đang rảnh rỗi?</h3>
            <p class="text-slate-500 mb-6 max-w-xs mx-auto">
              Chưa có đơn hàng nào đang thực hiện. Hãy đặt dịch vụ ngay để trải nghiệm!
            </p>
            <div class="flex gap-4 justify-center mb-4">
              <RouterLink
                to="/dashboard/services/moving-house"
                class="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
              >
                Chuyển nhà
              </RouterLink>
              <RouterLink
                to="/dashboard/services/moving-house"
                class="bg-sky-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-sky-700 transition shadow-lg shadow-emerald-200"
              >
                Giao hàng
              </RouterLink>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock class="w-5 h-5 text-emerald-600" /> Lịch sử gần đây
              </h3>
              <RouterLink
                to="/dashboard/order-list"
                class="text-emerald-600 text-sm font-bold hover:underline flex items-center group"
              >
                Xem tất cả
                <ChevronRight class="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </RouterLink>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr
                    class="text-left text-xs text-slate-400 border-b border-gray-100 uppercase tracking-wider"
                  >
                    <th class="pb-3 font-semibold pl-2">Mã đơn</th>
                    <th class="pb-3 font-semibold">Dịch vụ</th>
                    <th class="pb-3 font-semibold">Ngày</th>
                    <th class="pb-3 font-semibold text-right">Giá tiền</th>
                    <th class="pb-3 font-semibold text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody class="text-sm">
                  <tr v-if="recentOrders.length === 0">
                    <td colspan="5" class="py-8 text-center text-slate-400 italic">
                      Chưa có đơn hàng nào
                    </td>
                  </tr>
                  <tr
                    v-for="order in recentOrders"
                    :key="order.id"
                    class="group border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors"
                  >
                    <td
                      class="py-4 font-bold text-slate-800 pl-2 group-hover:text-emerald-600 transition"
                    >
                      #{{ order.id }}
                    </td>
                    <td class="py-4 text-slate-600 font-medium">
                      <div class="flex items-center gap-2">
                        <component
                          :is="order.type === 'Giao hàng' ? Package : Truck"
                          class="w-4 h-4 text-slate-400"
                        />
                        {{ order.type }}
                      </div>
                    </td>
                    <td class="py-4 text-slate-500">{{ order.date }}</td>
                    <td class="py-4 font-bold text-slate-800 text-right">
                      {{ formatCurrency(order.price) }}
                    </td>
                    <td class="py-4 text-center">
                      <span
                        class="px-2.5 py-1 rounded-full text-xs font-bold border capitalize"
                        :class="getStatusColor(order.status)"
                      >
                        {{ order.statusLabel }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="space-y-8">
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 class="text-lg font-bold mb-4 text-slate-900">Đặt dịch vụ mới</h3>
            <div class="space-y-3">
              <RouterLink to="/dashboard/services/moving-house" class="block">
                <button
                  class="w-full flex items-center p-3 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition group bg-white"
                >
                  <div
                    class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-200 transition shrink-0"
                  >
                    <Truck class="w-6 h-6" />
                  </div>
                  <div class="ml-3 text-left">
                    <p class="font-bold text-slate-900 text-sm">Chuyển nhà</p>
                    <p class="text-xs text-slate-500 mt-0.5">Trọn gói, tháo lắp</p>
                  </div>
                  <div
                    class="ml-auto w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-emerald-200 transition"
                  >
                    <Plus class="w-4 h-4 text-gray-400 group-hover:text-emerald-700" />
                  </div>
                </button>
              </RouterLink>

              <RouterLink to="/dashboard/services/delivery" class="block">
                <button
                  class="w-full flex items-center p-3 rounded-xl border border-gray-200 hover:border-sky-500 hover:bg-sky-50 transition group bg-white"
                >
                  <div
                    class="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600 group-hover:bg-sky-200 transition shrink-0"
                  >
                    <Package class="w-6 h-6" />
                  </div>
                  <div class="ml-3 text-left">
                    <p class="font-bold text-slate-900 text-sm">Giao hàng</p>
                    <p class="text-xs text-slate-500 mt-0.5">Nội thành siêu tốc</p>
                  </div>
                  <div
                    class="ml-auto w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-sky-200 transition"
                  >
                    <Plus class="w-4 h-4 text-gray-400 group-hover:text-sky-700" />
                  </div>
                </button>
              </RouterLink>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div
              class="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-center items-center text-center hover:shadow-md transition"
            >
              <div class="text-emerald-600 text-xs font-bold uppercase tracking-wide mb-1">
                Tổng đơn
              </div>
              <div class="text-3xl font-extrabold text-emerald-800">{{ stats.total }}</div>
            </div>
            <div
              class="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex flex-col justify-center items-center text-center hover:shadow-md transition"
            >
              <div class="text-orange-600 text-xs font-bold uppercase tracking-wide mb-1">
                Đang xử lý
              </div>
              <div class="text-3xl font-extrabold text-orange-800">{{ stats.processing }}</div>
            </div>
          </div>

          <div
            class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white text-center relative overflow-hidden shadow-lg group cursor-pointer hover:shadow-emerald-200 transition-shadow"
          >
            <div
              class="relative z-10 transform group-hover:scale-105 transition-transform duration-300"
            >
              <p class="font-bold text-lg">Giảm 20% hôm nay!</p>
              <p class="text-white/90 text-sm mt-1 mb-4 font-medium">
                Dành cho đơn chuyển nhà trọn gói
              </p>
              <button
                class="bg-white text-emerald-600 px-5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide hover:bg-emerald-50 transition shadow-md"
              >
                Lấy mã ngay
              </button>
            </div>
            <div
              class="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-xl"
            ></div>
            <div
              class="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 translate-y-1/2 blur-xl"
            ></div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
