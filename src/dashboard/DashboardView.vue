<script setup lang="ts">
import { ref, onMounted, onActivated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import {
  Package,
  Truck,
  ChevronRight,
  Clock,
  Plus,
  Phone,
  X,
  MapPin,
  Calendar,
  CreditCard,
  User as UserIcon,
  Box,
  Home,
  Loader2,
  Scale,
  FileText,
  Container,
  Sofa,
  ArrowUpCircle,
  AlertTriangle // Đã thêm icon này cho popup xác nhận hủy
} from 'lucide-vue-next'

const router = useRouter()
const user = ref<any>(null)
const loading = ref(true)

// --- STATE ---
const orders = ref<any[]>([])
const activeOrder = ref<any>(null)
const recentOrders = ref<any[]>([])
const stats = ref({ total: 0, processing: 0 })

// State cho Modal (Popup)
const showDetailModal = ref(false)
const showContactModal = ref(false)
const selectedOrderForModal = ref<any>(null)

// State cho chức năng Hủy đơn
const showCancelConfirm = ref(false)
const isCancelling = ref(false)

// --- HELPERS ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

const getProgress = (status: string) => {
  switch (status) {
    case 'pending': return 10
    case 'processing': return 50
    case 'shipping': return 80
    case 'completed': return 100
    case 'cancelled': return 0
    default: return 0
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'completed': return 'Hoàn tất'
    case 'shipping': return 'Đang thực hiện'
    case 'processing': return 'Đang xác nhận'
    case 'cancelled': return 'Đã hủy'
    default: return status
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'shipping': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'processing': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getHouseTypeLabel = (type: string) => {
  switch (type) {
    case 'apartment': return 'Chung cư'
    case 'alley': return 'Trong ngõ'
    case 'street': return 'Mặt phố'
    default: return type
  }
}

const parseMovingNote = (note: string) => {
  if (!note) return undefined
  const lines = note.split('\n')
  return {
    houseType: lines.find((l) => l.includes('Loại nhà:'))?.split(':')[1]?.trim() || '---',
    hasElevator: lines.find((l) => l.includes('Thang máy:'))?.split(':')[1]?.trim() || '---',
    items: lines.find((l) => l.includes('Đồ đạc'))?.split(':')[1]?.trim() || 'Không có đồ đạc',
    extraNote: lines.find((l) => l.includes('Ghi chú thêm:'))?.split(':')[1]?.trim() || '',
  }
}

const mapOrderToDashboard = (raw: any) => {
  return {
    id: raw.order_code || raw.id.slice(0, 8).toUpperCase(),
    statusLabel: getStatusLabel(raw.status),
    status: raw.status,
    driver: raw.driver_name || 'Đang điều phối',
    driverPhone: raw.driver_phone || '',
    vehicle: raw.vehicle_info || 'Xe tiêu chuẩn',
    from: raw.pickup_address,
    to: raw.dropoff_address,
    progress: getProgress(raw.status),
    serviceType: ['standard', 'express'].includes(raw.service_type) ? 'delivery' : 'moving',
  }
}

// --- LOGIC CHUẨN BỊ DATA CHO MODAL ---
const prepareModalData = () => {
  const active = activeOrder.value
  if (!active) return false
  const raw = orders.value.find((o) => o.order_code === active.id || o.id.slice(0, 8).toUpperCase() === active.id)
  if (!raw) return false

  const dateObj = new Date(raw.created_at)
  const isDeliveryGroup = ['standard', 'express', 'delivery'].includes(raw.service_type)

  selectedOrderForModal.value = {
    id: raw.id, // ID gốc (UUID) để dùng khi update API
    displayId: raw.order_code || raw.id.slice(0, 8).toUpperCase(),
    serviceType: isDeliveryGroup ? 'delivery' : 'moving',
    status: raw.status,
    statusLabel: getStatusLabel(raw.status),
    statusColor: getStatusColor(raw.status),
    date: dateObj.toLocaleDateString('vi-VN'),
    time: dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    price: raw.total_price || 0,
    from: raw.pickup_address,
    to: raw.dropoff_address,
    senderName: raw.sender_name || '---',
    senderPhone: raw.sender_phone || '---',
    receiverName: raw.receiver_name || '---',
    receiverPhone: raw.receiver_phone || '---',
    driverName: raw.driver_name || 'Đang điều phối',
    driverPhone: raw.driver_phone || '',
    vehicleInfo: raw.vehicle_info || 'Chưa có thông tin xe',
    weight: raw.weight || 0,
    packageType: raw.package_type || 'standard',
    note: raw.note || '',
    paymentMethod: raw.payment_method || 'cod',
    movingDetails: !isDeliveryGroup ? parseMovingNote(raw.note || '') : undefined,
  }
  return true
}

// --- LOGIC XỬ LÝ CLICK ---
const handleContactClick = () => {
  if (prepareModalData()) {
    showContactModal.value = true
  }
}

const handleSelectOrder = (realId: string) => {
  const selectedRaw = orders.value.find((o) => o.id === realId)
  if (selectedRaw) {
    activeOrder.value = mapOrderToDashboard(selectedRaw)
  }
}

const openActiveOrderDetails = () => {
  if (prepareModalData()) {
    showDetailModal.value = true
  }
}

// --- LOGIC HỦY ĐƠN HÀNG (MỚI) ---
const confirmCancelOrder = async () => {
  if (!selectedOrderForModal.value) return
  isCancelling.value = true
  
  try {
    // 1. Gọi API Supabase cập nhật trạng thái
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', selectedOrderForModal.value.id)

    if (error) throw error

    // 2. Cập nhật UI ngay lập tức (Optimistic Update)
    selectedOrderForModal.value.status = 'cancelled'
    selectedOrderForModal.value.statusLabel = 'Đã hủy'
    selectedOrderForModal.value.statusColor = getStatusColor('cancelled')

    // Nếu đơn vừa hủy đang hiển thị ở Card Active Order bên ngoài, reset nó
    if (activeOrder.value && activeOrder.value.id === selectedOrderForModal.value.displayId) {
      activeOrder.value = {
        ...activeOrder.value,
        status: 'cancelled',
        statusLabel: 'Đã hủy',
        progress: 0
      }
    }

    // 3. Tải lại dữ liệu mới nhất để đồng bộ hoàn toàn
    await fetchDashboardData()

    // 4. Đóng popup và thông báo
    showCancelConfirm.value = false
    alert('Đã hủy đơn hàng thành công!')

  } catch (err: any) {
    console.error('Lỗi hủy đơn:', err)
    alert('Không thể hủy đơn hàng: ' + err.message)
  } finally {
    isCancelling.value = false
  }
}


// --- FETCH DATA ---
const fetchDashboardData = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    user.value = session.user

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (data) {
      orders.value = data
      // Logic tìm đơn hàng active: Ưu tiên đơn đang processing/shipping
      if (!activeOrder.value) {
        const foundActive = data.find((o: any) => ['processing', 'shipping'].includes(o.status))
        activeOrder.value = foundActive ? mapOrderToDashboard(foundActive) : null
      } else {
        // Cập nhật lại activeOrder hiện tại nếu có thay đổi data
        const currentActiveRaw = data.find((o: any) => o.order_code === activeOrder.value?.id || o.id.slice(0, 8).toUpperCase() === activeOrder.value?.id)
        if(currentActiveRaw) activeOrder.value = mapOrderToDashboard(currentActiveRaw)
      }

      recentOrders.value = data.slice(0, 5).map((item: any) => ({
        realId: item.id,
        id: item.order_code || item.id.slice(0, 8).toUpperCase(),
        date: new Date(item.created_at).toLocaleDateString('vi-VN'),
        type: ['standard', 'express', 'delivery'].includes(item.service_type) ? 'Giao hàng' : 'Chuyển nhà',
        price: item.total_price || 0,
        status: item.status,
        statusLabel: getStatusLabel(item.status),
      }))
      stats.value = { total: data.length, processing: data.filter((o: any) => o.status === 'processing').length }
    }
  } catch (err) { console.error(err) } finally { loading.value = false }
}

let realtimeChannel: any = null
onMounted(() => {
  fetchDashboardData()
  realtimeChannel = supabase.channel('dashboard-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchDashboardData() }).subscribe()
})
onActivated(() => { fetchDashboardData() })
onUnmounted(() => { if (realtimeChannel) supabase.removeChannel(realtimeChannel) })
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex font-sans text-slate-800 w-full overflow-x-hidden">
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
          
          <div v-if="loading" class="h-64 bg-white rounded-2xl animate-pulse flex items-center justify-center">
            <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <div v-else-if="activeOrder" class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group transition-all hover:shadow-2xl">
            <div class="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition duration-700"></div>
            
            <div class="flex justify-between items-start mb-6 relative z-10">
              <div>
                <span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30 uppercase tracking-wider animate-pulse">{{ activeOrder.statusLabel }}</span>
                <h3 class="text-xl font-bold mt-3 flex items-center gap-2">Đơn hàng #{{ activeOrder.id }}</h3>
                <p class="text-slate-400 text-sm mt-1 flex items-center gap-2">Tài xế: <span class="text-white font-medium">{{ activeOrder.driver }}</span> • {{ activeOrder.vehicle }}</p>
              </div>
              <div class="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/5 shadow-inner">
                <Truck v-if="activeOrder.serviceType === 'moving'" class="w-8 h-8 text-emerald-400" />
                <Package v-else class="w-8 h-8 text-orange-400" />
              </div>
            </div>

            <div class="space-y-4 relative z-10 my-6 pl-1">
              <div class="flex gap-4 relative">
                <div class="absolute left-[5.5px] top-3 bottom-0 w-0.5 bg-slate-700 h-full"></div>
                <div class="flex flex-col items-center relative z-10"><div class="w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div></div>
                <div><p class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Điểm nhận hàng</p><p class="font-medium text-sm text-slate-100 mt-0.5 line-clamp-1">{{ activeOrder.from }}</p></div>
              </div>
              <div class="flex gap-4 relative z-10 pt-2">
                <div class="flex flex-col items-center"><div class="w-3 h-3 bg-white rounded-full border-2 border-slate-500"></div></div>
                <div><p class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Điểm trả hàng</p><p class="font-medium text-sm text-slate-100 mt-0.5 line-clamp-1">{{ activeOrder.to }}</p></div>
              </div>
            </div>

            <div class="mt-8 relative z-10">
              <div class="flex justify-between text-xs text-slate-400 mb-2 font-medium"><span>Tiến độ vận chuyển</span><span class="text-emerald-400">{{ activeOrder.progress }}%</span></div>
              <div class="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden backdrop-blur-sm"><div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" :style="{ width: activeOrder.progress + '%' }"></div></div>
              
              <div class="mt-6 flex gap-3">
                <button 
                  v-if="activeOrder.status !== 'completed' && activeOrder.status !== 'cancelled'"
                  @click="handleContactClick" 
                  class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-bold text-sm transition shadow-lg flex justify-center items-center gap-2"
                >
                  <Phone class="w-4 h-4" /> Liên hệ tài xế
                </button>
                <button @click="openActiveOrderDetails" class="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-bold text-sm transition">Chi tiết đơn</button>
              </div>
            </div>
          </div>

          <div v-else class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center h-64 animate-fade-in">
             <div class="bg-emerald-50 p-4 rounded-full mb-4"><Truck class="w-8 h-8 text-emerald-600" /></div>
             <h3 class="text-lg font-bold text-slate-900">Bạn đang rảnh rỗi?</h3>
             <p class="text-slate-500 mb-6 max-w-xs mx-auto">Chưa có đơn hàng nào đang thực hiện.</p>
             <div class="flex gap-4 justify-center mb-4">
               <RouterLink to="/dashboard/services/moving-house" class="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition">Chuyển nhà</RouterLink>
               <RouterLink to="/dashboard/services/delivery" class="bg-sky-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-sky-700 transition">Giao hàng</RouterLink>
             </div>
          </div>

          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2"><Clock class="w-5 h-5 text-emerald-600" /> Lịch sử gần đây</h3>
              <RouterLink to="/dashboard/order-list" class="text-emerald-600 text-sm font-bold hover:underline flex items-center group">Xem tất cả <ChevronRight class="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /></RouterLink>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead><tr class="text-left text-xs text-slate-400 border-b border-gray-100 uppercase tracking-wider"><th class="pb-3 font-semibold pl-2">Mã đơn</th><th class="pb-3 font-semibold">Dịch vụ</th><th class="pb-3 font-semibold">Ngày</th><th class="pb-3 font-semibold text-right">Giá tiền</th><th class="pb-3 font-semibold text-center">Trạng thái</th></tr></thead>
                <tbody class="text-sm">
                  <tr v-if="recentOrders?.length === 0"><td colspan="5" class="py-8 text-center text-slate-400 italic">Chưa có đơn hàng nào</td></tr>
                  <tr v-for="order in recentOrders" :key="order.realId" @click="handleSelectOrder(order.realId)" class="group border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-all duration-200 cursor-pointer relative" :class="{ 'bg-emerald-50 ring-1 ring-emerald-500/50 shadow-md z-10 rounded-lg -translate-y-0.5 border-transparent': activeOrder?.id === order.id }">
                    <td class="py-4 font-bold text-slate-800 pl-2 group-hover:text-emerald-600 transition">#{{ order.id }}</td>
                    <td class="py-4 text-slate-600 font-medium"><div class="flex items-center gap-2"><component :is="order.type === 'Giao hàng' ? Package : Truck" class="w-4 h-4 text-slate-400" />{{ order.type }}</div></td>
                    <td class="py-4 text-slate-500">{{ order.date }}</td>
                    <td class="py-4 font-bold text-slate-800 text-right">{{ formatCurrency(order.price) }}</td>
                    <td class="py-4 text-center"><span class="px-2.5 py-1 rounded-full text-xs font-bold border capitalize" :class="getStatusColor(order.status)">{{ order.statusLabel }}</span></td>
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
                 <RouterLink to="/dashboard/services/moving-house" class="block"><button class="w-full flex items-center p-3 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition group bg-white"><div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-200 transition shrink-0"><Truck class="w-6 h-6" /></div><div class="ml-3 text-left"><p class="font-bold text-slate-900 text-sm">Chuyển nhà</p><p class="text-xs text-slate-500 mt-0.5">Trọn gói, tháo lắp</p></div><div class="ml-auto w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-emerald-200 transition"><Plus class="w-4 h-4 text-gray-400 group-hover:text-emerald-700" /></div></button></RouterLink>
                 <RouterLink to="/dashboard/services/delivery" class="block"><button class="w-full flex items-center p-3 rounded-xl border border-gray-200 hover:border-sky-500 hover:bg-sky-50 transition group bg-white"><div class="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600 group-hover:bg-sky-200 transition shrink-0"><Package class="w-6 h-6" /></div><div class="ml-3 text-left"><p class="font-bold text-slate-900 text-sm">Giao hàng</p><p class="text-xs text-slate-500 mt-0.5">Nội thành siêu tốc</p></div><div class="ml-auto w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-sky-200 transition"><Plus class="w-4 h-4 text-gray-400 group-hover:text-sky-700" /></div></button></RouterLink>
              </div>
           </div>
           <div class="grid grid-cols-2 gap-4">
             <div class="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-center items-center text-center hover:shadow-md transition"><div class="text-emerald-600 text-xs font-bold uppercase tracking-wide mb-1">Tổng đơn</div><div class="text-3xl font-extrabold text-emerald-800">{{ stats.total }}</div></div>
             <div class="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex flex-col justify-center items-center text-center hover:shadow-md transition"><div class="text-orange-600 text-xs font-bold uppercase tracking-wide mb-1">Đang xử lý</div><div class="text-3xl font-extrabold text-orange-800">{{ stats.processing }}</div></div>
           </div>
           <div class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white text-center relative overflow-hidden shadow-lg group cursor-pointer hover:shadow-emerald-200 transition-shadow">
             <div class="relative z-10 transform group-hover:scale-105 transition-transform duration-300"><p class="font-bold text-lg">Giảm 20% hôm nay!</p><p class="text-white/90 text-sm mt-1 mb-4 font-medium">Dành cho đơn chuyển nhà trọn gói</p><button class="bg-white text-emerald-600 px-5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide hover:bg-emerald-50 transition shadow-md">Lấy mã ngay</button></div>
             <div class="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-xl"></div>
             <div class="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 translate-y-1/2 blur-xl"></div>
           </div>
        </div>
      </div>

      <div v-if="showDetailModal && selectedOrderForModal" class="fixed inset-0 z-[1000] flex items-center justify-center px-4 overflow-y-auto">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showDetailModal = false"></div>
        <div class="bg-white w-full max-w-2xl rounded-2xl p-0 relative z-10 animate-fade-in-up shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          
          <div class="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
            <div>
              <div class="flex items-center gap-3 mb-1">
                <h3 class="text-xl font-bold text-slate-900">Chi tiết đơn hàng</h3>
                <span class="text-sm font-normal text-slate-500 font-mono">#{{ selectedOrderForModal.displayId }}</span>
              </div>
              <p class="text-slate-500 text-sm">Ngày tạo: {{ selectedOrderForModal.date }}</p>
            </div>
            <button @click="showDetailModal = false" class="bg-white p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition"><X class="w-5 h-5 text-slate-500" /></button>
          </div>

          <div class="p-6 overflow-y-auto custom-scrollbar">
            
            <div class="flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-6">
              <div class="flex items-center gap-3">
                <span class="px-3 py-1 rounded-full text-xs font-bold border capitalize" :class="selectedOrderForModal.statusColor">
                  {{ selectedOrderForModal.statusLabel }}
                </span>
                <span class="text-sm text-emerald-800 font-medium flex items-center gap-2">
                  <component :is="selectedOrderForModal.serviceType === 'delivery' ? Package : Truck" class="w-4 h-4"/>
                  {{ selectedOrderForModal.serviceType === 'delivery' ? 'Giao hàng nhanh' : 'Chuyển nhà' }}
                </span>
              </div>
              <div class="text-right">
                <p class="text-xs text-slate-500 mb-1">Tổng thanh toán</p>
                <p class="text-2xl font-extrabold text-emerald-600">
                  {{ formatCurrency(selectedOrderForModal.price) }}
                </p>
              </div>
            </div>

            <div class="mb-8">
              <h4 class="text-sm font-bold text-slate-900 uppercase mb-3 flex items-center gap-2">
                <MapPin class="w-4 h-4 text-emerald-600" /> Lộ trình vận chuyển
              </h4>
              <div class="relative pl-6 border-l-2 border-gray-200 space-y-6 ml-2">
                <div class="relative">
                  <div class="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-emerald-500"></div>
                  <p class="text-xs font-bold text-emerald-600 mb-1">ĐIỂM LẤY HÀNG</p>
                  <p class="text-sm text-slate-800 font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {{ selectedOrderForModal.from }}
                  </p>
                  <div class="flex items-center gap-2 mt-1 text-xs text-slate-400 pl-1">
                     <Calendar class="w-3 h-3"/> {{ selectedOrderForModal.date }} 
                     <Clock class="w-3 h-3 ml-2"/> {{ selectedOrderForModal.time }}
                  </div>
                </div>
                <div class="relative">
                  <div class="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></div>
                  <p class="text-xs font-bold text-orange-500 mb-1">ĐIỂM GIAO HÀNG</p>
                  <p class="text-sm text-slate-800 font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {{ selectedOrderForModal.to }}
                  </p>
                </div>
              </div>
            </div>

            <div v-if="['shipping', 'completed'].includes(selectedOrderForModal.status)" class="mb-8">
               <h4 class="text-sm font-bold text-slate-900 uppercase mb-3 flex items-center gap-2">
                 <Truck class="w-4 h-4 text-emerald-600" /> Thông tin tài xế
               </h4>
               <div class="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                  <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-blue-200 shadow-sm text-blue-600">
                     <UserIcon class="w-6 h-6" />
                  </div>
                  <div class="flex-1">
                     <p class="text-sm font-bold text-slate-900">{{ selectedOrderForModal.driverName }}</p>
                     <p class="text-xs text-slate-500">{{ selectedOrderForModal.vehicleInfo }}</p>
                  </div>
               </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div class="space-y-4">
                <h4 class="text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                  <UserIcon class="w-4 h-4 text-emerald-600" /> Thông tin liên hệ
                </h4>
                <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm h-full">
                  <div>
                    <p class="text-xs text-slate-500 mb-1">Người gửi</p>
                    <p class="font-medium text-slate-800">{{ selectedOrderForModal.senderName }}</p>
                    <p class="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone class="w-3 h-3" /> {{ selectedOrderForModal.senderPhone }}
                    </p>
                  </div>
                  <hr class="border-gray-100" />
                  <div>
                    <p class="text-xs text-slate-500 mb-1">Người nhận</p>
                    <p class="font-medium text-slate-800">{{ selectedOrderForModal.receiverName }}</p>
                    <p class="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone class="w-3 h-3" /> {{ selectedOrderForModal.receiverPhone }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-if="selectedOrderForModal.serviceType === 'delivery'" class="space-y-4">
                <h4 class="text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                  <Package class="w-4 h-4 text-emerald-600" /> Kiện hàng & Thanh toán
                </h4>
                <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm h-full">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-slate-500 flex items-center gap-2">
                      <component :is="selectedOrderForModal.packageType === 'bulky' ? Container : Box" class="w-4 h-4" />
                      Loại kiện
                    </span>
                    <span class="font-bold text-xs px-2 py-1 rounded border uppercase"
                      :class="selectedOrderForModal.packageType === 'bulky'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'">
                      {{ selectedOrderForModal.packageType === 'bulky' ? 'Cồng kềnh' : 'Tiêu chuẩn' }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-slate-500 flex items-center gap-2">
                      <Scale class="w-4 h-4" /> Khối lượng
                    </span>
                    <span class="font-bold text-slate-800">{{ selectedOrderForModal.weight }} kg</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-slate-500 flex items-center gap-2">
                      <CreditCard class="w-4 h-4" /> Thanh toán
                    </span>
                    <span class="font-bold text-slate-800 uppercase text-xs bg-gray-100 px-2 py-1 rounded">
                      {{ selectedOrderForModal.paymentMethod === 'cod' ? 'Tiền mặt' : 'Online' }}
                    </span>
                  </div>
                  <div class="pt-2" v-if="selectedOrderForModal.note">
                    <p class="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <FileText class="w-3 h-3" /> Ghi chú
                    </p>
                    <p class="text-sm text-slate-700 italic bg-gray-50 p-2 rounded border border-gray-100">
                      "{{ selectedOrderForModal.note }}"
                    </p>
                  </div>
                </div>
              </div>

              <div v-else class="space-y-4">
                <h4 class="text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                  <Home class="w-4 h-4 text-emerald-600" /> Thông tin chuyển nhà
                </h4>
                <div class="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm h-full">
                  <div class="flex justify-between">
                    <span class="text-sm text-slate-500 flex items-center gap-2">
                      <Home class="w-4 h-4" /> Loại nhà
                    </span>
                    <span class="font-bold text-slate-800">
                      {{ getHouseTypeLabel(selectedOrderForModal.movingDetails?.houseType || '') }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-slate-500 flex items-center gap-2">
                      <ArrowUpCircle class="w-4 h-4" /> Thang máy
                    </span>
                    <span class="font-bold text-slate-800">
                      {{ selectedOrderForModal.movingDetails?.hasElevator }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm text-slate-500 flex items-center gap-2">
                      <CreditCard class="w-4 h-4" /> Thanh toán
                    </span>
                    <span class="font-bold text-slate-800 uppercase text-xs bg-gray-100 px-2 py-1 rounded">
                      {{ selectedOrderForModal.paymentMethod === 'cod' ? 'Tiền mặt' : 'Online' }}
                    </span>
                  </div>

                  <hr class="border-gray-100 my-2" />

                  <div class="space-y-2">
                    <p class="text-xs text-slate-500 flex items-center gap-1 font-bold">
                      <Sofa class="w-3 h-3" /> Đồ đạc cần chuyển
                    </p>
                    <p class="text-sm text-slate-800 bg-emerald-50/50 p-2 rounded border border-emerald-100 leading-relaxed">
                      {{ selectedOrderForModal.movingDetails?.items }}
                    </p>
                  </div>

                  <div v-if="selectedOrderForModal.movingDetails?.extraNote" class="pt-1">
                    <p class="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <FileText class="w-3 h-3" /> Ghi chú thêm
                    </p>
                    <p class="text-sm text-slate-700 italic bg-gray-50 p-2 rounded border border-gray-100">
                      "{{ selectedOrderForModal.movingDetails?.extraNote }}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
             <button @click="showDetailModal = false" class="bg-white border border-gray-300 text-slate-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-50 transition">
              Đóng
            </button>
            <button v-if="['processing', 'shipping'].includes(selectedOrderForModal.status)" @click="showCancelConfirm = true" class="bg-red-50 border border-red-200 text-red-600 px-6 py-2 rounded-lg font-bold hover:bg-red-100 transition">
              Hủy đơn hàng
            </button>
          </div>

          <div
            v-if="showCancelConfirm"
            class="absolute inset-0 z-[60] flex items-center justify-center bg-white/90 backdrop-blur-sm animate-fade-in"
          >
            <div class="bg-white p-6 rounded-2xl shadow-2xl border border-red-100 max-w-sm w-full mx-4 text-center transform scale-100 animate-bounce-in">
              <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle class="w-8 h-8 text-red-600" />
              </div>
              <h4 class="text-lg font-bold text-slate-900 mb-2">Xác nhận hủy đơn?</h4>
              <p class="text-slate-500 text-sm mb-6">
                Bạn có chắc muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.
              </p>
              <div class="flex gap-3">
                <button
                  @click="showCancelConfirm = false"
                  class="flex-1 py-2.5 bg-gray-100 text-slate-700 font-bold rounded-xl hover:bg-gray-200 transition"
                >
                  Không
                </button>
                <button
                  @click="confirmCancelOrder"
                  :disabled="isCancelling"
                  class="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span
                    v-if="isCancelling"
                    class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                  ></span>
                  {{ isCancelling ? 'Đang hủy...' : 'Đồng ý hủy' }}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div v-if="showContactModal && selectedOrderForModal" class="fixed inset-0 z-[1000] flex items-center justify-center px-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showContactModal = false"></div>
        <div class="bg-white w-full max-w-sm rounded-2xl p-6 relative z-10 animate-fade-in-up shadow-2xl">
          
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-slate-900 flex items-center gap-2">
               <Phone class="w-5 h-5 text-emerald-600" /> Liên hệ tài xế
            </h3>
            <button @click="showContactModal = false" class="text-slate-400 hover:text-slate-600 p-1 bg-gray-50 rounded-full hover:bg-gray-100 transition"><X class="w-5 h-5" /></button>
          </div>

          <div v-if="selectedOrderForModal.status === 'processing'" class="text-center py-6">
            <div class="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-100 relative">
              <div class="absolute inset-0 rounded-full border-4 border-yellow-200 border-t-yellow-500 animate-spin"></div>
              <Truck class="w-8 h-8 text-yellow-600" />
            </div>
            <h4 class="text-lg font-bold text-slate-800 mb-2">Đang tìm tài xế</h4>
            <p class="text-slate-500 text-sm px-2">Hệ thống đang kết nối với các đối tác tài xế gần bạn nhất. Vui lòng chờ trong giây lát.</p>
          </div>

          <div v-else-if="['shipping', 'completed'].includes(selectedOrderForModal.status)" class="space-y-6">
            
            <div class="flex items-center gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <div class="w-14 h-14 rounded-full bg-white flex items-center justify-center text-emerald-600 shrink-0 border-2 border-emerald-200 shadow-sm">
                <Truck class="w-7 h-7" />
              </div>
              <div class="flex-1">
                <p class="text-xs text-slate-500 font-bold uppercase mb-1">Tài xế phụ trách</p>
                <p class="text-slate-900 font-bold text-lg leading-tight mb-1">{{ selectedOrderForModal.driverName }}</p>
                <span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-white border border-gray-200 text-slate-600">
                   {{ selectedOrderForModal.vehicleInfo }}
                </span>
              </div>
            </div>

            <div class="bg-gray-50 p-5 rounded-xl border border-gray-200 text-center">
              <p class="text-xs text-slate-500 font-bold uppercase mb-2">Số điện thoại liên hệ</p>
              
              <div class="flex items-center justify-center gap-3">
                <Phone class="w-6 h-6 text-emerald-600" />
                
                <span v-if="selectedOrderForModal.driverPhone && selectedOrderForModal.driverPhone !== 'N/A'" 
                      class="text-3xl font-bold text-slate-900 tracking-wider selection:bg-emerald-100 selection:text-emerald-700">
                  {{ selectedOrderForModal.driverPhone }}
                </span>
                
                <span v-else class="text-xl font-bold text-slate-400 italic">
                  Chưa cập nhật SĐT
                </span>
              </div>
              
              <p v-if="!selectedOrderForModal.driverPhone || selectedOrderForModal.driverPhone === 'N/A'" class="text-xs text-red-500 mt-2">
                * Tài xế chưa cập nhật số điện thoại trong hồ sơ
              </p>
            </div>

          </div>

          <div v-else class="text-center py-8">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <UserIcon class="w-8 h-8 text-gray-400" />
            </div>
            <p class="text-slate-500">Thông tin tài xế không khả dụng cho trạng thái đơn hàng này.</p>
          </div>

          <button @click="showContactModal = false" class="w-full mt-6 bg-white border border-gray-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition">Đóng</button>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
.animate-fade-in-up { animation: fadeInUp 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bounceIn { 0% { transform: scale(0.9); opacity: 0; } 50% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
.animate-bounce-in { animation: bounceIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
</style>