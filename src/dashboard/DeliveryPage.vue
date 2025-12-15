<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, onMounted } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  Package,
  Weight,
  MapPin,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Calculator,
  Wallet,
  CreditCard,
  QrCode,
  Clock,
  Home,
} from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/supabase'

const router = useRouter()

// --- 0. ICON MAP ---
const pickupIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const dropoffIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// --- STATE QUẢN LÝ ---
const currentStep = ref(1)
const distance = ref(0)
const isCalculating = ref(false)

// STATE THANH TOÁN ONLINE
const isShowQR = ref(false)
const countdown = ref(120)
let timerInterval: any = null

// Map Variables
let map: L.Map | null = null
let markers: L.Marker[] = []

// --- STATE TÌM KIẾM ---
const pickupQuery = ref('')
const dropoffQuery = ref('')

const isSelecting = ref(false)

const pickupSuggestions = ref<any[]>([])
const dropoffSuggestions = ref<any[]>([])
const isSearchingPickup = ref(false)
const isSearchingDropoff = ref(false)
const notFoundPickup = ref(false)
const notFoundDropoff = ref(false)

let pickupDebounce: any = null
let dropoffDebounce: any = null

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
  paymentMethod: 'cod',
})

// --- LOGIC RESET DỮ LIỆU ---
const resetState = () => {
  currentStep.value = 1
  distance.value = 0
  isCalculating.value = false
  isShowQR.value = false
  if (timerInterval) clearInterval(timerInterval)

  if (map) {
    map.remove()
    map = null
    markers = []
  }

  // Reset form (Giữ thông tin người gửi)
  form.value.receiverName = ''
  form.value.receiverPhone = ''
  form.value.weight = 1
  form.value.type = 'standard'
  form.value.note = ''
  form.value.pickupAddress = ''
  form.value.dropoffAddress = ''
  form.value.paymentMethod = 'cod'

  // Reset tìm kiếm
  pickupQuery.value = ''
  dropoffQuery.value = ''
  coords.value = { pickup: null, dropoff: null }
}

// --- CÁC HÀM XỬ LÝ ---
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

const profile = ref({ full_name: 'Đang tải...', phone: '' })

const getProfile = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const meta = user.user_metadata || {}
      profile.value = {
        full_name: meta.full_name || 'Khách hàng',
        phone: user.phone || meta.phone || '',
      }
      form.value.senderName = profile.value.full_name
      form.value.senderPhone = profile.value.phone
    }
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  getProfile()
})

watch(pickupQuery, (v) => {
  if (isSelecting.value) return
  clearTimeout(pickupDebounce)
  pickupDebounce = setTimeout(() => fetchNominatim(v, 'pickup'), 800)
})

watch(dropoffQuery, (v) => {
  if (isSelecting.value) return
  clearTimeout(dropoffDebounce)
  dropoffDebounce = setTimeout(() => fetchNominatim(v, 'dropoff'), 800)
})

const selectAddress = (item: any, type: 'pickup' | 'dropoff') => {
  isSelecting.value = true // <-- 1. Bật cờ lên để chặn watch

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

  nextTick(() => {
    isSelecting.value = false
  })
}

const initMap = () => {
  if (map) {
    map.remove()
    map = null
  }

  map = L.map('mapContainer').setView([21.0285, 105.8542], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)
}

const calculateRoute = async () => {
  if (!coords.value.pickup || !coords.value.dropoff) {
    return alert('Vui lòng chọn địa chỉ từ gợi ý!')
  }
  isCalculating.value = true
  markers.forEach((m) => map?.removeLayer(m))
  markers = []

  const start = coords.value.pickup
  const end = coords.value.dropoff

  const startMarker = L.marker(start, { icon: pickupIcon })
    .addTo(map!)
    .bindPopup('🚚 Điểm lấy')
    .openPopup()
  const endMarker = L.marker(end, { icon: dropoffIcon }).addTo(map!).bindPopup('📦 Điểm giao')
  markers.push(startMarker, endMarker)

  const group = new L.FeatureGroup(markers)
  map!.fitBounds(group.getBounds().pad(0.1))

  try {
    const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=false`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error('Server lỗi')
    const data = await res.json()
    if (data.code === 'Ok' && data.routes.length) {
      distance.value = parseFloat((data.routes[0].distance / 1000).toFixed(1))
    } else {
      throw new Error('No route')
    }
  } catch (e) {
    const straightDistance = calculateDistance(start[0], start[1], end[0], end[1])
    distance.value = parseFloat((straightDistance * 1.3).toFixed(1))
  } finally {
    isCalculating.value = false
  }
}

// Thêm state để lưu ảnh QR base64
const qrDataURL = ref('')

const generateVietQR = async () => {
  // Thay thông tin của bạn vào đây
  const BANK_ID = 'MB' // Mã ngân hàng (MB, VCB, TPB...)
  const ACCOUNT_NO = '0333053420'
  const TEMPLATE = 'compact' // compact, print, qr_only

  // Tạo nội dung chuyển khoản độc nhất để dễ check (Ví dụ: GD + mã đơn hàng)
  // Lưu ý: Nội dung không dấu, không ký tự đặc biệt
  const content = `GOTRANS GD${Math.floor(Math.random() * 10000)}`

  try {
    const res = await fetch('https://api.vietqr.io/v2/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountNo: ACCOUNT_NO,
        accountName: 'NGUYEN VAN A', // Tên chủ tài khoản (tùy chọn)
        acqId: BANK_ID, // Bin code ngân hàng (MB là 970422) hoặc dùng tên viết tắt nếu thư viện hỗ trợ
        addInfo: content,
        amount: totalPrice.value, // Số tiền từ biến computed
        template: TEMPLATE,
      }),
    })

    const data = await res.json()
    if (data.code === '00') {
      qrDataURL.value = data.data.qrDataURL // Chuỗi base64 của ảnh QR
    }
  } catch (error) {
    console.error('Lỗi tạo QR:', error)
  }
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return parseFloat((R * c).toFixed(1))
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
    if (!isShowQR.value) initMap()
  }
})
watch([() => coords.value.pickup, () => coords.value.dropoff], () => {
  if (currentStep.value === 3) distance.value = 0
})

// ... (Giữ nguyên các import và code cũ)

// --- 1. THÊM STATE LƯU LỖI ---
const errors = ref({
  senderName: '',
  senderPhone: '',
  receiverName: '',
  receiverPhone: '',
  weight: '',
})

const clearError = (field: keyof typeof errors.value) => {
  errors.value[field] = ''
}

// --- 2. HÀM VALIDATE (KIỂM TRA DỮ LIỆU) ---
const validateStep = (step: number) => {
  let isValid = true

  // Reset lỗi cũ của bước hiện tại
  if (step === 1) {
    errors.value.senderName = ''
    errors.value.senderPhone = ''
    errors.value.receiverName = ''
    errors.value.receiverPhone = ''

    // Validate Người gửi
    if (!form.value.senderName.trim()) {
      errors.value.senderName = 'Vui lòng nhập họ tên người gửi'
      isValid = false
    }

    // Validate SĐT Người gửi (10 số, toàn bộ là số)
    if (!form.value.senderPhone) {
      errors.value.senderPhone = 'Vui lòng nhập số điện thoại'
      isValid = false
    } else if (!/^\d{10}$/.test(form.value.senderPhone)) {
      errors.value.senderPhone = 'SĐT phải bao gồm đúng 10 chữ số'
      isValid = false
    }

    // Validate Người nhận
    if (!form.value.receiverName.trim()) {
      errors.value.receiverName = 'Vui lòng nhập họ tên người nhận'
      isValid = false
    }

    // Validate SĐT Người nhận
    if (!form.value.receiverPhone) {
      errors.value.receiverPhone = 'Vui lòng nhập số điện thoại'
      isValid = false
    } else if (!/^\d{10}$/.test(form.value.receiverPhone)) {
      errors.value.receiverPhone = 'SĐT phải bao gồm đúng 10 chữ số'
      isValid = false
    }
  }

  if (step === 2) {
    errors.value.weight = ''
    // Validate Khối lượng (> 0)
    if (!form.value.weight) {
      errors.value.weight = 'Vui lòng nhập khối lượng'
      isValid = false
    } else if (Number(form.value.weight) <= 0) {
      errors.value.weight = 'Khối lượng phải lớn hơn 0'
      isValid = false
    }
  }

  return isValid
}

// --- 3. SỬA HÀM NEXTSTEP ---
const nextStep = () => {
  // Nếu validate thất bại thì dừng lại, không next
  if (!validateStep(currentStep.value)) return

  if (currentStep.value < 3) currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}

// Submit
const handleSubmit = () => {
  if (form.value.paymentMethod === 'cod') {
    currentStep.value = 4
  } else {
    isShowQR.value = true
    startCountdown()
  }
}

const startCountdown = () => {
  countdown.value = 120
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timerInterval)
      isShowQR.value = false
      currentStep.value = 4
    }
  }, 1000)
}

const cancelQR = () => {
  if (timerInterval) clearInterval(timerInterval)
  isShowQR.value = false
  nextTick(() => {
    map?.remove()
    map = null
    initMap()
    if (coords.value.pickup && coords.value.dropoff) calculateRoute()
  })
}

// CẬP NHẬT: Reset và quay về Dashboard
const goDashboard = () => {
  resetState()
  router.push('/dashboard')
}

// CẬP NHẬT: Reset khi rời trang
onBeforeRouteLeave((to, from, next) => {
  resetState()
  next()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
  if (timerInterval) clearInterval(timerInterval)
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
          :style="{ width: ((currentStep - 1) / 3) * 100 + '%' }"
        ></div>
        <div
          v-for="step in 4"
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
        <span>Liên lạc</span><span>Gói hàng</span><span>Lộ trình</span><span>Hoàn tất</span>
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
              >Bước 1/4</span
            >
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            <div class="space-y-5">
              <div
                class="flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-wider"
              >
                <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                Người gửi
              </div>
              <div class="space-y-4">
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-slate-500 ml-1"
                    >Họ tên <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="form.senderName"
                    @focus="clearError('senderName')"
                    :class="[
                      'w-full pl-3 pr-4 py-3 bg-gray-50 border rounded-xl outline-none transition-all',
                      errors.senderName
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-emerald-500',
                    ]"
                  />
                  <p v-if="errors.senderName" class="text-red-500 text-xs ml-1">
                    {{ errors.senderName }}
                  </p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-slate-500 ml-1"
                    >SĐT <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="form.senderPhone"
                    @focus="clearError('senderPhone')"
                    type="tel"
                    maxlength="10"
                    :class="[
                      'w-full pl-3 pr-4 py-3 bg-gray-50 border rounded-xl outline-none transition-all',
                      errors.senderPhone
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-emerald-500',
                    ]"
                  />
                  <p v-if="errors.senderPhone" class="text-red-500 text-xs ml-1">
                    {{ errors.senderPhone }}
                  </p>
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
                  <label class="text-xs font-semibold text-slate-500 ml-1"
                    >Họ tên <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="form.receiverName"
                    @focus="clearError('receiverName')"
                    :class="[
                      'w-full pl-3 pr-4 py-3 bg-gray-50 border rounded-xl outline-none transition-all',
                      errors.receiverName
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-orange-500',
                    ]"
                  />
                  <p v-if="errors.receiverName" class="text-red-500 text-xs ml-1">
                    {{ errors.receiverName }}
                  </p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-slate-500 ml-1"
                    >SĐT <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="form.receiverPhone"
                    @focus="clearError('receiverPhone')"
                    type="tel"
                    maxlength="10"
                    :class="[
                      'w-full pl-3 pr-4 py-3 bg-gray-50 border rounded-xl outline-none transition-all',
                      errors.receiverPhone
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-orange-500',
                    ]"
                  />
                  <p v-if="errors.receiverPhone" class="text-red-500 text-xs ml-1">
                    {{ errors.receiverPhone }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 2" class="space-y-8 animate-fade-in">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 class="text-lg font-bold text-slate-800">Chi tiết kiện hàng</h3>
            <span class="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md"
              >Bước 2/4</span
            >
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700"
                >Khối lượng (kg) <span class="text-red-500">*</span></label
              >
              <div class="space-y-1">
                <div class="relative group">
                  <Weight class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    v-model="form.weight"
                    @focus="clearError('weight')"
                    type="number"
                    min="0.1"
                    step="0.1"
                    :class="[
                      'w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl outline-none transition-all',
                      errors.weight
                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-emerald-500',
                    ]"
                  />
                </div>
                <p v-if="errors.weight" class="text-red-500 text-xs ml-1">{{ errors.weight }}</p>
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
            <div class="md:col-span-2 space-y-1">
              <label class="text-sm font-bold text-slate-700">Ghi chú (Tùy chọn)</label>
              <textarea
                v-model="form.note"
                placeholder="Ví dụ: Hàng dễ vỡ, vui lòng gọi trước..."
                class="w-full p-3 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none bg-gray-50"
              ></textarea>
            </div>
          </div>
        </div>

        <div v-else-if="currentStep === 3" class="space-y-6 flex flex-col flex-1 animate-fade-in">
          <template v-if="!isShowQR">
            <div class="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 class="text-lg font-bold text-slate-800">Lộ trình & Thanh toán</h3>
              <span class="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md"
                >Bước 3/4</span
              >
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-1 relative z-[1001]">
                <label class="text-xs font-bold text-emerald-600 uppercase ml-1"
                  >Điểm lấy hàng</label
                >
                <div class="relative group">
                  <MapPin class="absolute left-3 top-3 w-5 h-5 text-emerald-600 z-10" />
                  <input
                    v-model="pickupQuery"
                    type="text"
                    placeholder="Nhập địa chỉ..."
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
              </div>
              <div class="space-y-1 relative z-[1000]">
                <label class="text-xs font-bold text-orange-500 uppercase ml-1"
                  >Điểm giao hàng</label
                >
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

            <div v-if="distance > 0" class="space-y-6">
              <div
                class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100 animate-fade-in"
              >
                <div
                  class="flex justify-between items-end mb-4 border-b border-emerald-200/50 pb-4"
                >
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

              <div>
                <h4 class="font-bold text-slate-800 mb-3 text-sm uppercase">
                  Phương thức thanh toán
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    @click="form.paymentMethod = 'cod'"
                    :class="[
                      'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                      form.paymentMethod === 'cod'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                        : 'border-gray-200 hover:bg-gray-50 text-slate-600',
                    ]"
                  >
                    <div class="p-2 bg-white rounded-full border border-gray-100 shadow-sm">
                      <Wallet
                        class="w-5 h-5"
                        :class="
                          form.paymentMethod === 'cod' ? 'text-emerald-600' : 'text-slate-400'
                        "
                      />
                    </div>
                    <div>
                      <p class="font-bold text-sm">Thanh toán khi nhận hàng</p>
                      <p class="text-xs opacity-70">Tiền mặt (COD)</p>
                    </div>
                    <div class="ml-auto" v-if="form.paymentMethod === 'cod'">
                      <CheckCircle class="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>

                  <div
                    @click="form.paymentMethod = 'online'"
                    :class="[
                      'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                      form.paymentMethod === 'online'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                        : 'border-gray-200 hover:bg-gray-50 text-slate-600',
                    ]"
                  >
                    <div class="p-2 bg-white rounded-full border border-gray-100 shadow-sm">
                      <CreditCard
                        class="w-5 h-5"
                        :class="
                          form.paymentMethod === 'online' ? 'text-emerald-600' : 'text-slate-400'
                        "
                      />
                    </div>
                    <div>
                      <p class="font-bold text-sm">Thanh toán trực tuyến</p>
                      <p class="text-xs opacity-70">VNPAY / MOMO / Banking</p>
                    </div>
                    <div class="ml-auto" v-if="form.paymentMethod === 'online'">
                      <CheckCircle class="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="flex flex-col items-center justify-center text-center animate-fade-in py-6">
              <h3 class="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                <QrCode class="w-6 h-6 text-emerald-600" /> Quét mã để thanh toán
              </h3>
              <p class="text-slate-500 mb-6 max-w-sm">
                Vui lòng sử dụng ứng dụng ngân hàng để quét mã bên dưới. Đơn hàng sẽ tự động hoàn
                tất sau khi thanh toán.
              </p>

              <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-lg mb-6 relative">
                <img
                  :src="`https://img.vietqr.io/image/MB-0333053420-compact.jpg?amount=${totalPrice}&addInfo=GOTRANS ${profile.phone}`"
                  alt="QR Code"
                  class="w-64 h-64 object-contain"
                />

                <div
                  class="absolute -top-3 -right-3 bg-red-500 text-white w-14 h-14 rounded-full flex flex-col items-center justify-center font-bold shadow-md animate-bounce border-2 border-white"
                >
                  <span class="text-xs font-light">còn</span>
                  <span class="leading-none">{{ countdown }}s</span>
                </div>
              </div>

              <div
                class="bg-slate-50 rounded-xl p-4 w-full max-w-md text-left space-y-3 mb-6 border border-slate-100"
              >
                <div class="flex justify-between border-b border-slate-200 pb-2">
                  <span class="text-slate-500 text-sm">Ngân hàng</span
                  ><span class="font-bold text-slate-800">MB Bank (Quân Đội)</span>
                </div>
                <div class="flex justify-between border-b border-slate-200 pb-2">
                  <span class="text-slate-500 text-sm">Số tài khoản</span
                  ><span class="font-bold text-slate-800">0333053420</span>
                </div>
                <div class="flex justify-between border-b border-slate-200 pb-2">
                  <span class="text-slate-500 text-sm">Số tiền</span
                  ><span class="font-bold text-emerald-600 text-lg"
                    >{{ totalPrice.toLocaleString() }}đ</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500 text-sm">Nội dung</span
                  ><span class="font-bold text-slate-800"
                    >GOTRANS THANH TOAN {{ profile.phone }}</span
                  >
                </div>
              </div>

              <div class="flex gap-3">
                <button
                  @click="cancelQR"
                  class="px-6 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition"
                >
                  Hủy bỏ
                </button>
                <button
                  class="flex items-center gap-2 px-6 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-bold"
                >
                  <Clock class="w-4 h-4 animate-spin" /> Đang chờ thanh toán...
                </button>
              </div>
            </div>
          </template>
        </div>

        <div
          v-else-if="currentStep === 4"
          class="flex flex-col items-center justify-center text-center py-10 animate-fade-in"
        >
          <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle class="w-10 h-10 text-emerald-600" />
          </div>
          <h3 class="text-2xl font-bold text-slate-900 mb-2">Đặt đơn hàng thành công!</h3>
          <p class="text-slate-500 mb-8 max-w-md">
            Cảm ơn bạn đã sử dụng dịch vụ GoTrans. Tài xế sẽ liên hệ với bạn trong giây lát. Mã đơn
            hàng:
            <span class="font-mono font-bold text-slate-800"
              >#GD{{ Math.floor(Math.random() * 10000) }}</span
            >
          </p>

          <div
            class="bg-slate-50 p-6 rounded-2xl w-full max-w-md mb-8 border border-slate-100 text-left space-y-3"
          >
            <h4 class="font-bold text-slate-800 border-b pb-2 mb-2">Chi tiết đơn hàng</h4>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Người gửi:</span
              ><span class="font-medium text-slate-800">{{ form.senderName }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Người nhận:</span
              ><span class="font-medium text-slate-800">{{ form.receiverName }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Tổng tiền:</span
              ><span class="font-bold text-emerald-600">{{ totalPrice.toLocaleString() }}đ</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Thanh toán:</span
              ><span class="font-medium text-slate-800 uppercase">{{
                form.paymentMethod === 'cod' ? 'Tiền mặt' : 'Online'
              }}</span>
            </div>
          </div>

          <button
            @click="goDashboard"
            class="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg transition"
          >
            <Home class="w-4 h-4" /> Quay về trang chủ
          </button>
        </div>
      </div>

      <div v-if="currentStep < 4 && !isShowQR" class="mt-8 flex justify-between items-center">
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
</style>
