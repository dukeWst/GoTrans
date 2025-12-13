<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import {
  LayoutDashboard,
  Package,
  History,
  User,
  LogOut,
  Truck,
  MapPin,
  Bell,
  Plus,
  ChevronRight,
} from 'lucide-vue-next'

const router = useRouter()
const user = ref<any>(null)
const loading = ref(true)

// Mock data cho giao diện (Sau này sẽ fetch từ database)
const activeOrder = ref({
  id: 'ORD-7829',
  status: 'Đang vận chuyển',
  driver: 'Nguyễn Văn Tài',
  vehicle: 'Xe tải 1.5 Tấn',
  from: '123 Nguyễn Trãi, Thanh Xuân, HN',
  to: '456 Cầu Giấy, Hà Nội',
  progress: 60, // 60%
})

const recentOrders = [
  {
    id: 'ORD-7820',
    date: '10/12/2025',
    type: 'Chuyển nhà',
    price: '1.200.000đ',
    status: 'Hoàn thành',
  },
  {
    id: 'ORD-7815',
    date: '05/12/2025',
    type: 'Giao hàng',
    price: '150.000đ',
    status: 'Hoàn thành',
  },
]

onMounted(async () => {
  // Lấy thông tin user hiện tại
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    router.push('/login')
    return
  }

  user.value = session.user
  loading.value = false
})

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex font-sans text-slate-800">
    <aside class="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-10">
      <div class="p-8">
        <h1 class="text-2xl font-extrabold text-emerald-600 flex items-center gap-2">
          <Truck class="w-8 h-8" /> GoTrans
        </h1>
      </div>

      <nav class="flex-1 px-4 space-y-2">
        <a
          href="#"
          class="flex items-center gap-3 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-medium transition"
        >
          <LayoutDashboard class="w-5 h-5" /> Tổng quan
        </a>
        <a
          href="#"
          class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-gray-50 hover:text-slate-900 rounded-xl font-medium transition"
        >
          <Package class="w-5 h-5" /> Đơn hàng
        </a>
        <a
          href="#"
          class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-gray-50 hover:text-slate-900 rounded-xl font-medium transition"
        >
          <History class="w-5 h-5" /> Lịch sử
        </a>
        <a
          href="#"
          class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-gray-50 hover:text-slate-900 rounded-xl font-medium transition"
        >
          <User class="w-5 h-5" /> Tài khoản
        </a>
      </nav>

      <div class="p-4 border-t border-gray-100">
        <button
          @click="handleLogout"
          class="flex items-center gap-3 px-4 py-3 w-full text-left text-red-500 hover:bg-red-50 rounded-xl font-medium transition"
        >
          <LogOut class="w-5 h-5" /> Đăng xuất
        </button>
      </div>
    </aside>

    <main class="flex-1 md:ml-64 p-6 lg:p-10">
      <header class="flex justify-between items-center mb-10">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">
            Xin chào, {{ user?.user_metadata?.full_name || 'Khách hàng' }} 👋
          </h2>
          <p class="text-slate-500 mt-1">Chào mừng quay trở lại với GoTrans.</p>
        </div>

        <div class="flex items-center gap-4">
          <button class="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 relative">
            <Bell class="w-6 h-6 text-slate-600" />
            <span
              class="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
            ></span>
          </button>
          <div
            class="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold border-2 border-white shadow-sm"
          >
            {{ user?.user_metadata?.full_name?.charAt(0) || 'U' }}
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-8">
          <div
            class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden"
          >
            <div
              class="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
            ></div>

            <div class="flex justify-between items-start mb-6 relative z-10">
              <div>
                <span
                  class="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30 uppercase tracking-wider"
                >
                  {{ activeOrder.status }}
                </span>
                <h3 class="text-xl font-bold mt-2">Đơn hàng #{{ activeOrder.id }}</h3>
                <p class="text-slate-400 text-sm">
                  Tài xế: {{ activeOrder.driver }} • {{ activeOrder.vehicle }}
                </p>
              </div>
              <div class="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                <Truck class="w-8 h-8 text-emerald-400" />
              </div>
            </div>

            <div class="space-y-4 relative z-10">
              <div class="flex gap-4">
                <div class="flex flex-col items-center">
                  <div class="w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-emerald-500/20"></div>
                  <div class="w-0.5 h-10 bg-slate-600 my-1"></div>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Điểm đi</p>
                  <p class="font-medium text-sm">{{ activeOrder.from }}</p>
                </div>
              </div>
              <div class="flex gap-4">
                <div class="flex flex-col items-center">
                  <div class="w-3 h-3 bg-white rounded-full border-2 border-slate-500"></div>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Điểm đến</p>
                  <p class="font-medium text-sm">{{ activeOrder.to }}</p>
                </div>
              </div>
            </div>

            <div class="mt-8">
              <div class="flex justify-between text-xs text-slate-400 mb-2">
                <span>Tiến độ</span>
                <span>{{ activeOrder.progress }}%</span>
              </div>
              <div class="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  class="bg-emerald-500 h-2 rounded-full transition-all duration-1000"
                  :style="{ width: activeOrder.progress + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-lg font-bold">Lịch sử gần đây</h3>
              <a
                href="#"
                class="text-emerald-600 text-sm font-medium hover:underline flex items-center"
              >
                Xem tất cả <ChevronRight class="w-4 h-4 ml-1" />
              </a>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="text-left text-xs text-slate-500 border-b border-gray-100">
                    <th class="pb-3 font-medium">Mã đơn</th>
                    <th class="pb-3 font-medium">Dịch vụ</th>
                    <th class="pb-3 font-medium">Ngày</th>
                    <th class="pb-3 font-medium">Giá tiền</th>
                    <th class="pb-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody class="text-sm">
                  <tr v-for="order in recentOrders" :key="order.id" class="group">
                    <td
                      class="py-4 font-medium text-slate-900 group-hover:text-emerald-600 transition"
                    >
                      {{ order.id }}
                    </td>
                    <td class="py-4 text-slate-600">{{ order.type }}</td>
                    <td class="py-4 text-slate-500">{{ order.date }}</td>
                    <td class="py-4 font-semibold text-slate-900">{{ order.price }}</td>
                    <td class="py-4">
                      <span
                        class="px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium"
                      >
                        {{ order.status }}
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
            <h3 class="text-lg font-bold mb-4">Đặt dịch vụ mới</h3>
            <div class="space-y-3">
              <button
                class="w-full flex items-center p-3 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition group"
              >
                <div
                  class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-200 transition"
                >
                  <Truck class="w-5 h-5" />
                </div>
                <div class="ml-3 text-left">
                  <p class="font-semibold text-slate-900">Chuyển nhà</p>
                  <p class="text-xs text-slate-500">Trọn gói, tháo lắp</p>
                </div>
                <Plus class="w-5 h-5 text-gray-400 ml-auto group-hover:text-emerald-500" />
              </button>

              <button
                class="w-full flex items-center p-3 rounded-xl border border-gray-200 hover:border-sky-500 hover:bg-sky-50 transition group"
              >
                <div
                  class="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center text-sky-600 group-hover:bg-sky-200 transition"
                >
                  <Package class="w-5 h-5" />
                </div>
                <div class="ml-3 text-left">
                  <p class="font-semibold text-slate-900">Giao hàng</p>
                  <p class="text-xs text-slate-500">Nội thành siêu tốc</p>
                </div>
                <Plus class="w-5 h-5 text-gray-400 ml-auto group-hover:text-sky-500" />
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="bg-emerald-50 p-5 rounded-2xl">
              <div class="text-emerald-600 text-sm font-medium mb-1">Tổng đơn</div>
              <div class="text-2xl font-bold text-emerald-900">12</div>
            </div>
            <div class="bg-orange-50 p-5 rounded-2xl">
              <div class="text-orange-600 text-sm font-medium mb-1">Điểm thưởng</div>
              <div class="text-2xl font-bold text-orange-900">850</div>
            </div>
          </div>

          <div
            class="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white text-center relative overflow-hidden shadow-lg"
          >
            <div class="relative z-10">
              <p class="font-bold text-lg">Giảm 20% hôm nay!</p>
              <p class="text-white/80 text-sm mt-1 mb-4">Dành cho đơn chuyển nhà trọn gói</p>
              <button
                class="bg-white text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-50 transition"
              >
                Lấy mã ngay
              </button>
            </div>
            <div
              class="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2"
            ></div>
            <div
              class="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -translate-x-1/2 translate-y-1/2"
            ></div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
