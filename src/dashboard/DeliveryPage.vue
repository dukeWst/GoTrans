<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import {
  Package,
  User,
  Weight,
  MapPin,
  Phone,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Calculator,
  Truck,
} from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// --- STATE QUẢN LÝ ---
const currentStep = ref(1)
const distance = ref(0)
const isCalculating = ref(false)

// Map Variables
let map: L.Map | null = null
let routeLine: L.Polyline | null = null
let markers: L.Marker[] = []

// --- STATE TÌM KIẾM ---
const pickupQuery = ref('')
const dropoffQuery = ref('')
const pickupSuggestions = ref<any[]>([])
const dropoffSuggestions = ref<any[]>([])
const isSearchingPickup = ref(false)
const isSearchingDropoff = ref(false)
const notFoundPickup = ref(false)
const notFoundDropoff = ref(false)

let pickupDebounce: any = null
let dropoffDebounce: any = null

// Lưu tọa độ thực tế
const coords = ref({
  pickup: null as [number, number] | null,
  dropoff: null as [number, number] | null,
})

// Dữ liệu Form
const form = ref({
  senderName: '',
  senderPhone: '',
  receiverName: '',
  receiverPhone: '',
  weight: 1,
  type: 'standard',
  note: '',
  pickupAddress: '',
  dropoffAddress: '',
})

// --- 1. HÀM TÌM KIẾM ĐỊA CHỈ (NOMINATIM) ---
const fetchNominatim = async (query: string, type: 'pickup' | 'dropoff') => {
  if (!query || query.length < 2) return
  if (type === 'pickup') {
    isSearchingPickup.value = true
    notFoundPickup.value = false
  } else {
    isSearchingDropoff.value = true
    notFoundDropoff.value = false
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=vi`
    const res = await fetch(url)
    const data = await res.json()

    if (type === 'pickup') {
      pickupSuggestions.value = data
      notFoundPickup.value = data.length === 0
    } else {
      dropoffSuggestions.value = data
      notFoundDropoff.value = data.length === 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    if (type === 'pickup') isSearchingPickup.value = false
    else isSearchingDropoff.value = false
  }
}

watch(pickupQuery, (v) => {
  clearTimeout(pickupDebounce)
  pickupDebounce = setTimeout(() => fetchNominatim(v, 'pickup'), 800)
})
watch(dropoffQuery, (v) => {
  clearTimeout(dropoffDebounce)
  dropoffDebounce = setTimeout(() => fetchNominatim(v, 'dropoff'), 800)
})

// --- CHỌN ĐỊA CHỈ ---
const selectAddress = (item: any, type: 'pickup' | 'dropoff') => {
  const fullAddress = item.display_name
  const lat = parseFloat(item.lat)
  const lon = parseFloat(item.lon)

  if (type === 'pickup') {
    form.value.pickupAddress = fullAddress
    pickupQuery.value = fullAddress
    pickupSuggestions.value = []
    coords.value.pickup = [lat, lon]
  } else {
    form.value.dropoffAddress = fullAddress
    dropoffQuery.value = fullAddress
    dropoffSuggestions.value = []
    coords.value.dropoff = [lat, lon]
  }
}

// --- KHỞI TẠO MAP ---
const initMap = () => {
  if (map) return
  map = L.map('mapContainer').setView([21.0285, 105.8542], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)
}

// --- 5. TÍNH ĐƯỜNG ĐI THỰC TẾ (SERVER ĐỨC - TRỰC TIẾP) ---
const calculateRoute = async () => {
  if (!coords.value.pickup || !coords.value.dropoff) {
    return alert('Vui lòng chọn địa chỉ từ danh sách gợi ý!')
  }
  isCalculating.value = true

  // Xóa cũ
  if (routeLine) map?.removeLayer(routeLine)
  markers.forEach((m) => map?.removeLayer(m))
  markers = []

  const start = coords.value.pickup
  const end = coords.value.dropoff

  // Marker
  const startMarker = L.circleMarker(start, { color: 'green', radius: 8 })
    .addTo(map!)
    .bindPopup('Điểm lấy')
    .openPopup()
  const endMarker = L.circleMarker(end, { color: 'orange', radius: 8 })
    .addTo(map!)
    .bindPopup('Điểm giao')
  markers.push(startMarker, endMarker)

  try {
    // SỬ DỤNG SERVER CỦA ĐỨC (ROUTED-CAR)
    // Server này hỗ trợ CORS tốt, cho phép gọi trực tiếp từ localhost mà không cần Proxy
    const osrmUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`

    console.log('Đang tải lộ trình (Direct):', osrmUrl)

    // Gọi trực tiếp (Không qua Proxy)
    const res = await fetch(osrmUrl)

    if (!res.ok) {
      if (res.status === 429) throw new Error('Quá nhiều yêu cầu, vui lòng đợi 1 phút')
      throw new Error(`Lỗi kết nối Server (${res.status})`)
    }

    const data = await res.json()

    if (data.code === 'Ok' && data.routes.length > 0) {
      const route = data.routes[0]

      // 1. Khoảng cách thực tế (km)
      distance.value = parseFloat((route.distance / 1000).toFixed(1))

      // 2. Vẽ đường uốn lượn
      const pathCoords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]])

      routeLine = L.polyline(pathCoords, {
        color: '#059669', // Màu xanh
        weight: 6,
        opacity: 0.8,
        lineJoin: 'round',
      }).addTo(map!)

      map!.fitBounds(L.latLngBounds(pathCoords), { padding: [50, 50] })
    } else {
      throw new Error('Không tìm thấy đường đi ô tô')
    }
  } catch (e: any) {
    console.error(e)
    alert(`Lỗi: ${e.message}. \n\nNếu lỗi này lặp lại, có thể Server đang bảo trì.`)
    distance.value = 0
  } finally {
    isCalculating.value = false
  }
}

const totalPrice = computed(() => {
  if (!distance.value) return 0
  let total = 15000 + distance.value * 5000 + form.value.weight * 2000
  if (form.value.type === 'express') total *= 1.3
  return Math.round(total)
})

watch(currentStep, async (v) => {
  if (v === 3) {
    await nextTick()
    initMap()
  }
})
watch([() => coords.value.pickup, () => coords.value.dropoff], () => {
  if (currentStep.value === 3) distance.value = 0
})
const nextStep = () => {
  if (currentStep.value < 3) currentStep.value++
}
const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}
const handleSubmit = () => alert(`Tổng tiền: ${totalPrice.value.toLocaleString()}đ`)

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <main class="flex-1 md:ml-64 p-6 lg:p-10 bg-gray-50 min-h-screen flex flex-col">
    <header class="mb-8">
      <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <Package class="w-6 h-6 text-emerald-600" /> Tạo đơn Giao hàng
      </h2>
      <p class="text-slate-500 mt-1">Dịch vụ vận chuyển nhanh chóng, an toàn.</p>
    </header>

    <div class="mb-8 mx-auto w-full max-w-3xl">
      <div class="flex items-center justify-between relative">
        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
        <div
          class="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 transition-all duration-300 -z-10"
          :style="{ width: ((currentStep - 1) / 2) * 100 + '%' }"
        ></div>
        <div
          v-for="step in 3"
          :key="step"
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-4',
            currentStep >= step
              ? 'bg-emerald-600 border-emerald-100 text-white'
              : 'bg-white border-gray-200 text-gray-400',
          ]"
        >
          {{ step }}
        </div>
      </div>
      <div class="flex justify-between mt-2 text-xs font-medium text-slate-500">
        <span>Liên lạc</span><span>Gói hàng</span><span>Lộ trình</span>
      </div>
    </div>

    <div class="flex-1 flex flex-col max-w-3xl mx-auto w-full">
      <div
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8 flex-1 flex flex-col"
      >
        <div v-if="currentStep === 1" class="space-y-8 animate-fade-in">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 class="text-lg font-bold text-slate-800">Thông tin liên lạc</h3>
            <span class="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md"
              >Bước 1/3</span
            >
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            <div
              class="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-gray-100 -translate-x-1/2"
            ></div>
            <div class="space-y-5">
              <div
                class="flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-wider"
              >
                <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                Người gửi
              </div>
              <div class="space-y-4">
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-slate-500 ml-1">Họ tên</label
                  ><input
                    v-model="form.senderName"
                    placeholder="Nguyễn Văn A"
                    class="w-full pl-3 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-slate-500 ml-1">Số điện thoại</label
                  ><input
                    v-model="form.senderPhone"
                    placeholder="0912 xxx xxx"
                    class="w-full pl-3 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <div class="space-y-5">
              <div
                class="flex items-center gap-2 text-orange-500 font-bold text-sm uppercase tracking-wider"
              >
                <div class="w-2 h-2 rounded-full bg-orange-500"></div>
                Người nhận
              </div>
              <div class="space-y-4">
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-slate-500 ml-1">Họ tên</label
                  ><input
                    v-model="form.receiverName"
                    placeholder="Trần Thị B"
                    class="w-full pl-3 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-slate-500 ml-1">Số điện thoại</label
                  ><input
                    v-model="form.receiverPhone"
                    placeholder="0987 xxx xxx"
                    class="w-full pl-3 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 2" class="space-y-8 animate-fade-in">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 class="text-lg font-bold text-slate-800">Chi tiết kiện hàng</h3>
            <span class="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md"
              >Bước 2/3</span
            >
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Khối lượng (kg)</label>
              <div class="relative group">
                <Weight
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                /><input
                  v-model="form.weight"
                  type="number"
                  min="1"
                  class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Loại dịch vụ</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  @click="form.type = 'standard'"
                  :class="[
                    'p-3 rounded-xl border text-sm font-medium transition-all',
                    form.type === 'standard'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200',
                  ]"
                >
                  Tiêu chuẩn
                </button>
                <button
                  @click="form.type = 'express'"
                  :class="[
                    'p-3 rounded-xl border text-sm font-medium transition-all',
                    form.type === 'express'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200',
                  ]"
                >
                  Hỏa tốc
                </button>
              </div>
            </div>
            <textarea
              v-model="form.note"
              placeholder="Ghi chú..."
              class="w-full p-3 border rounded-xl md:col-span-2"
            ></textarea>
          </div>
        </div>

        <div v-else class="space-y-6 flex flex-col flex-1 animate-fade-in">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 class="text-lg font-bold text-slate-800">Lộ trình & Thanh toán</h3>
            <span class="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md"
              >Bước 3/3</span
            >
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-1 relative z-[1001]">
              <label class="text-xs font-bold text-emerald-600 uppercase ml-1">Điểm lấy hàng</label>
              <div class="relative group">
                <MapPin class="absolute left-3 top-3 w-5 h-5 text-emerald-600 z-10" />
                <input
                  v-model="pickupQuery"
                  type="text"
                  placeholder="Nhập địa chỉ (VD: Hà Nội)..."
                  class="w-full pl-10 pr-10 py-3 bg-white border border-gray-300 rounded-xl focus:border-emerald-500 outline-none shadow-sm"
                />
                <div
                  v-if="isSearchingPickup"
                  class="absolute right-3 top-3 w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"
                ></div>
              </div>
              <div
                v-if="pickupSuggestions.length > 0"
                class="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50"
              >
                <div
                  v-for="(item, index) in pickupSuggestions"
                  :key="index"
                  @click="selectAddress(item, 'pickup')"
                  class="p-3 hover:bg-emerald-50 cursor-pointer text-sm text-slate-700 border-b border-gray-50 flex flex-col"
                >
                  <span class="font-bold text-slate-900">{{
                    (item.display_name || '').split(',')[0]
                  }}</span
                  ><span class="text-xs text-slate-500 truncate">{{ item.display_name }}</span>
                </div>
              </div>
              <div
                v-if="notFoundPickup && !isSearchingPickup"
                class="absolute top-full left-0 w-full mt-1 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 shadow-lg z-50"
              >
                Không tìm thấy địa điểm.
              </div>
            </div>

            <div class="space-y-1 relative z-[1000]">
              <label class="text-xs font-bold text-orange-500 uppercase ml-1">Điểm giao hàng</label>
              <div class="relative group">
                <MapPin class="absolute left-3 top-3 w-5 h-5 text-orange-500 z-10" />
                <input
                  v-model="dropoffQuery"
                  type="text"
                  placeholder="Nhập địa chỉ..."
                  class="w-full pl-10 pr-10 py-3 bg-white border border-gray-300 rounded-xl focus:border-orange-500 outline-none shadow-sm"
                />
                <div
                  v-if="isSearchingDropoff"
                  class="absolute right-3 top-3 w-5 h-5 border-2 border-orange-500/30 border-t-orange-600 rounded-full animate-spin"
                ></div>
              </div>
              <div
                v-if="dropoffSuggestions.length > 0"
                class="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50"
              >
                <div
                  v-for="(item, index) in dropoffSuggestions"
                  :key="index"
                  @click="selectAddress(item, 'dropoff')"
                  class="p-3 hover:bg-orange-50 cursor-pointer text-sm text-slate-700 border-b border-gray-50 flex flex-col"
                >
                  <span class="font-bold text-slate-900">{{
                    (item.display_name || '').split(',')[0]
                  }}</span
                  ><span class="text-xs text-slate-500 truncate">{{ item.display_name }}</span>
                </div>
              </div>
              <div
                v-if="notFoundDropoff && !isSearchingDropoff"
                class="absolute top-full left-0 w-full mt-1 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600 shadow-lg z-50"
              >
                Không tìm thấy địa điểm.
              </div>
            </div>
          </div>

          <div
            class="relative rounded-2xl overflow-hidden border border-gray-200 h-64 md:h-80 bg-slate-100 shadow-inner z-0"
          >
            <div id="mapContainer" class="w-full h-full z-0"></div>
            <div
              v-if="!distance"
              class="absolute inset-0 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center z-[500] p-4 text-center"
            >
              <button
                @click="calculateRoute"
                class="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:scale-105 shadow-xl transition-all"
              >
                <Calculator v-if="!isCalculating" class="w-4 h-4" />
                {{ isCalculating ? 'Đang tìm đường...' : 'Xem lộ trình & Giá tiền' }}
              </button>
            </div>
          </div>

          <div
            v-if="distance > 0"
            class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100 animate-fade-in"
          >
            <div class="flex justify-between items-end mb-4 border-b border-emerald-200/50 pb-4">
              <div>
                <p class="text-sm text-emerald-700">Khoảng cách thực</p>
                <p class="text-2xl font-bold text-emerald-900">{{ distance }} km</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-emerald-700">Tổng chi phí</p>
                <p class="text-3xl font-extrabold text-emerald-600">
                  {{ totalPrice.toLocaleString('vi-VN') }}đ
                </p>
              </div>
            </div>
            <div class="space-y-1.5 text-xs text-emerald-800">
              <div class="flex justify-between">
                <span>Phí mở cửa:</span><span class="font-medium">15.000đ</span>
              </div>
              <div class="flex justify-between">
                <span>Phí vận chuyển:</span
                ><span class="font-medium">{{ (distance * 5000).toLocaleString() }}đ</span>
              </div>
              <div class="flex justify-between">
                <span>Phí khối lượng:</span
                ><span class="font-medium">{{ (form.weight * 2000).toLocaleString() }}đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 flex justify-between items-center">
        <button
          v-if="currentStep > 1"
          @click="prevStep"
          class="flex items-center gap-2 text-slate-500 font-bold px-4 py-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft class="w-5 h-5" /> Quay lại
        </button>
        <button
          v-if="currentStep < 3"
          @click="nextStep"
          class="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg"
        >
          Tiếp theo <ChevronRight class="w-5 h-5" />
        </button>
        <button
          v-else
          @click="handleSubmit"
          :disabled="!distance"
          class="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg disabled:opacity-50"
        >
          Đặt đơn ngay
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
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
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
</style>
