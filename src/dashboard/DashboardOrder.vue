<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Package,
  Truck,
  Calendar,
  Clock,
  ChevronRight,
  Search,
  X,
  User,
  Phone,
  MapPin,
  CreditCard,
  Scale,
  FileText,
  Box, // [MỚI] Icon kiện hàng
  Container, // [MỚI] Icon hàng cồng kềnh
} from 'lucide-vue-next'
import { supabase } from '@/supabase'

// --- 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU ---
interface Order {
  id: string
  displayId: string
  serviceType: string
  status: string
  date: string
  time: string
  price: number
  from: string
  to: string

  // Các trường chi tiết
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  weight: number

  // [MỚI] Loại kiện hàng
  packageType: 'standard' | 'bulky'

  note: string
  paymentMethod: string
}

// --- 2. QUẢN LÝ TRẠNG THÁI (STATE) ---
const loading = ref(false)
const activeFilter = ref('all')
const searchQuery = ref('')
const orders = ref<Order[]>([])
const selectedOrder = ref<Order | null>(null) // State điều khiển Modal

// --- 3. LẤY DỮ LIỆU TỪ SUPABASE ---
const getOrders = async () => {
  loading.value = true
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (data) {
      orders.value = data.map((item: any) => {
        const dateObj = new Date(item.created_at)
        const rawType = item.service_type
        const isDeliveryGroup = ['standard', 'express', 'delivery'].includes(rawType)

        return {
          id: item.id,
          displayId: item.order_code || item.id.slice(0, 8).toUpperCase(),
          serviceType: isDeliveryGroup ? 'delivery' : 'moving',
          status: item.status || 'processing',
          date: dateObj.toLocaleDateString('vi-VN'),
          time: dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          price: item.total_price || 0,
          from: item.pickup_address || 'Chưa cập nhật',
          to: item.dropoff_address || 'Chưa cập nhật',
          senderName: item.sender_name || '---',
          senderPhone: item.sender_phone || '---',
          receiverName: item.receiver_name || '---',
          receiverPhone: item.receiver_phone || '---',
          weight: item.weight || 0,

          // [MỚI] Map dữ liệu package_type (mặc định là standard nếu null)
          packageType: item.package_type || 'standard',

          note: item.note || 'Không có ghi chú',
          paymentMethod: item.payment_method || 'cod',
        }
      })
    }
  } catch (error) {
    console.error('Lỗi tải đơn hàng:', error)
  } finally {
    loading.value = false
  }
}

// --- 4. LOGIC LỌC VÀ TÌM KIẾM ---
const filteredOrders = computed(() => {
  return orders.value.filter((order) => {
    const statusMatch = activeFilter.value === 'all' || order.status === activeFilter.value
    const searchLower = searchQuery.value.toLowerCase()
    const searchMatch =
      order.displayId.toLowerCase().includes(searchLower) ||
      order.from.toLowerCase().includes(searchLower) ||
      order.to.toLowerCase().includes(searchLower) ||
      order.senderName.toLowerCase().includes(searchLower) ||
      order.receiverName.toLowerCase().includes(searchLower)

    return statusMatch && searchMatch
  })
})

// --- 5. CÁC HÀM BỔ TRỢ (HELPER) ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

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

// --- 6. XỬ LÝ MODAL ---
const openDetails = (order: Order) => {
  selectedOrder.value = order
}

const closeDetails = () => {
  selectedOrder.value = null
}

onMounted(() => {
  getOrders()
})
</script>

<template>
  <main class="flex-1 md:ml-64 p-4 lg:p-10 bg-slate-50 min-h-screen relative">
    <header
      class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
    >
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Lịch sử hoạt động</h2>
        <p class="text-slate-500 mt-1">Quản lý các đơn hàng vận chuyển của bạn.</p>
      </div>
      <div class="relative w-full md:w-auto">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Tìm mã đơn, tên, địa chỉ..."
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
        @click="openDetails(item)"
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
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-slate-800 text-sm md:text-base">
                  {{ item.serviceType === 'delivery' ? 'Giao hàng nhanh' : 'Chuyển nhà' }}
                </h4>

                <span
                  v-if="item.packageType === 'bulky'"
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-orange-100 text-orange-700 border-orange-200"
                >
                  Cồng kềnh
                </span>
              </div>
              <span class="text-xs text-slate-500 font-mono">#{{ item.displayId }}</span>
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

        <div
          class="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4 bg-gray-50/50 p-3 rounded-lg"
        >
          <div>
            <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Người gửi</p>
            <p class="text-sm font-bold text-slate-700 truncate">{{ item.senderName }}</p>
            <p class="text-xs text-slate-500">{{ item.senderPhone }}</p>
          </div>
          <div class="text-right">
            <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Người nhận</p>
            <p class="text-sm font-bold text-slate-700 truncate">{{ item.receiverName }}</p>
            <p class="text-xs text-slate-500">{{ item.receiverPhone }}</p>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
          <div class="flex items-center gap-4 text-xs text-slate-500">
            <div class="flex items-center gap-1">
              <Calendar class="w-3.5 h-3.5" /> {{ item.date }}
            </div>
            <div class="flex items-center gap-1"><Clock class="w-3.5 h-3.5" /> {{ item.time }}</div>
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

    <div v-if="selectedOrder" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeDetails"></div>

      <div
        class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col animate-fade-in-up"
      >
        <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
              Chi tiết đơn hàng
              <span class="text-sm font-normal text-slate-500 font-mono"
                >#{{ selectedOrder.displayId }}</span
              >
            </h3>
            <p class="text-sm text-slate-500 mt-1 flex items-center gap-2">
              Ngày tạo: {{ selectedOrder.date }} - {{ selectedOrder.time }}
            </p>
          </div>
          <button
            @click="closeDetails"
            class="p-2 hover:bg-white rounded-full transition shadow-sm border border-transparent hover:border-gray-200"
          >
            <X class="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div class="p-6 overflow-y-auto space-y-6">
          <div
            class="flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-emerald-50/50 p-4 rounded-xl border border-emerald-100"
          >
            <div class="flex items-center gap-3">
              <span
                class="px-3 py-1 rounded-full text-xs font-bold border capitalize"
                :class="getStatusColor(selectedOrder.status)"
              >
                {{ getStatusLabel(selectedOrder.status) }}
              </span>
              <span class="text-sm text-emerald-800 font-medium">
                {{ selectedOrder.serviceType === 'delivery' ? 'Giao hàng nhanh' : 'Chuyển nhà' }}
              </span>
            </div>
            <div class="text-right">
              <p class="text-xs text-slate-500 mb-1">Tổng thanh toán</p>
              <p class="text-2xl font-extrabold text-emerald-600">
                {{ formatCurrency(selectedOrder.price) }}
              </p>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-bold text-slate-900 uppercase mb-3 flex items-center gap-2">
              <MapPin class="w-4 h-4 text-emerald-600" /> Lộ trình vận chuyển
            </h4>
            <div class="relative pl-6 border-l-2 border-gray-200 space-y-6 ml-2">
              <div class="relative">
                <div
                  class="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-emerald-500"
                ></div>
                <p class="text-xs font-bold text-emerald-600 mb-1">ĐIỂM LẤY HÀNG</p>
                <p
                  class="text-sm text-slate-800 font-medium bg-gray-50 p-3 rounded-lg border border-gray-100"
                >
                  {{ selectedOrder.from }}
                </p>
              </div>
              <div class="relative">
                <div
                  class="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm"
                ></div>
                <p class="text-xs font-bold text-orange-500 mb-1">ĐIỂM GIAO HÀNG</p>
                <p
                  class="text-sm text-slate-800 font-medium bg-gray-50 p-3 rounded-lg border border-gray-100"
                >
                  {{ selectedOrder.to }}
                </p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="space-y-4">
              <h4 class="text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                <User class="w-4 h-4 text-emerald-600" /> Thông tin liên hệ
              </h4>
              <div
                class="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm h-full"
              >
                <div>
                  <p class="text-xs text-slate-500 mb-1">Người gửi</p>
                  <p class="font-medium text-slate-800">{{ selectedOrder.senderName }}</p>
                  <p class="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone class="w-3 h-3" /> {{ selectedOrder.senderPhone }}
                  </p>
                </div>
                <hr class="border-gray-100" />
                <div>
                  <p class="text-xs text-slate-500 mb-1">Người nhận</p>
                  <p class="font-medium text-slate-800">{{ selectedOrder.receiverName }}</p>
                  <p class="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone class="w-3 h-3" /> {{ selectedOrder.receiverPhone }}
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <h4 class="text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                <Package class="w-4 h-4 text-emerald-600" /> Kiện hàng & Thanh toán
              </h4>
              <div
                class="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm h-full"
              >
                <div class="flex justify-between items-center">
                  <span class="text-sm text-slate-500 flex items-center gap-2">
                    <component
                      :is="selectedOrder.packageType === 'bulky' ? Container : Box"
                      class="w-4 h-4"
                    />
                    Loại kiện
                  </span>
                  <span
                    class="font-bold text-xs px-2 py-1 rounded border uppercase"
                    :class="
                      selectedOrder.packageType === 'bulky'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    "
                  >
                    {{ selectedOrder.packageType === 'bulky' ? 'Cồng kềnh' : 'Tiêu chuẩn' }}
                  </span>
                </div>

                <div class="flex justify-between">
                  <span class="text-sm text-slate-500 flex items-center gap-2"
                    ><Scale class="w-4 h-4" /> Khối lượng</span
                  >
                  <span class="font-bold text-slate-800">{{ selectedOrder.weight }} kg</span>
                </div>

                <div class="flex justify-between">
                  <span class="text-sm text-slate-500 flex items-center gap-2"
                    ><CreditCard class="w-4 h-4" /> Thanh toán</span
                  >
                  <span
                    class="font-bold text-slate-800 uppercase text-xs bg-gray-100 px-2 py-1 rounded"
                  >
                    {{ selectedOrder.paymentMethod === 'cod' ? 'Tiền mặt' : 'Online' }}
                  </span>
                </div>
                <div class="pt-2">
                  <p class="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <FileText class="w-3 h-3" /> Ghi chú
                  </p>
                  <p
                    class="text-sm text-slate-700 italic bg-gray-50 p-2 rounded border border-gray-100"
                  >
                    "{{ selectedOrder.note }}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            @click="closeDetails"
            class="px-6 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-slate-700 hover:bg-gray-50 transition"
          >
            Đóng
          </button>
          <button
            v-if="selectedOrder.status === 'processing'"
            class="px-6 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-100 transition"
          >
            Hủy đơn
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Ẩn scrollbar */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Animation cho Modal */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.animate-fade-in-up {
  animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
