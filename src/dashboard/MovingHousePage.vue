<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  nextTick,
  onUnmounted,
  onMounted,
  onDeactivated,
  onActivated,
} from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  Truck,
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
  Sofa,
  CheckSquare,
  Package,
} from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/supabase'
import { useRoute } from 'vue-router'

const router = useRouter()

// --- 0. CONFIG ICON MAP ---
const pickupIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const dropoffIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// --- 1. STATE QUẢN LÝ ---
const currentStep = ref(1)
const distance = ref(0)
const isCalculating = ref(false)
const isSubmitting = ref(false)
const isLoadingPage = ref(false)

// State thanh toán QR
const isShowQR = ref(false)
const activeQRId = ref<string | null>(null)
let qrSubscription: any = null

// Map Variables
let map: L.Map | null = null
let markers: L.Marker[] = []

// State tìm kiếm địa chỉ
const pickupQuery = ref('')
const dropoffQuery = ref('')
const isSelecting = ref(false)
const pickupSuggestions = ref<any[]>([])
const dropoffSuggestions = ref<any[]>([])
const isSearchingPickup = ref(false)
const isSearchingDropoff = ref(false)

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
  houseType: 'apartment', // apartment | alley | street
  hasElevator: true,
  items: [] as string[],
  note: '',
  pickupAddress: '',
  dropoffAddress: '',
  paymentMethod: 'cod',
})

// Mock list đồ đạc
const commonItems = [
  'Giường ngủ',
  'Tủ quần áo',
  'Tủ lạnh',
  'Máy giặt',
  'Sofa',
  'Bàn làm việc',
  'Kệ sách',
  'Tivi & Kệ',
  'Bàn ăn',
  'Điều hòa',
]

const toggleItem = (item: string) => {
  if (form.value.items.includes(item)) {
    form.value.items = form.value.items.filter((i) => i !== item)
  } else {
    form.value.items.push(item)
  }
}

// Validation Errors
const errors = ref({
  senderName: '',
  senderPhone: '',
  receiverName: '',
  receiverPhone: '',
  items: '',
})

const clearError = (field: keyof typeof errors.value) => {
  errors.value[field] = ''
}

// --- 2. RESET STATE (QUAN TRỌNG: Đưa mọi thứ về mặc định) ---
const resetState = () => {
  // Reset Step & UI
  currentStep.value = 1
  distance.value = 0
  isCalculating.value = false
  isSubmitting.value = false
  isShowQR.value = false

  // Reset Map
  if (map) {
    map.remove()
    map = null
  }
  pickupQuery.value = ''
  dropoffQuery.value = ''
  pickupSuggestions.value = []
  dropoffSuggestions.value = []
  isSearchingPickup.value = false
  isSearchingDropoff.value = false
  coords.value = { pickup: null, dropoff: null }

  // Reset Form Data (Xóa sạch)
  form.value = {
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    houseType: 'apartment',
    hasElevator: true,
    items: [],
    note: '',
    pickupAddress: '',
    dropoffAddress: '',
    paymentMethod: 'cod',
  }

  // Reset Errors
  errors.value = {
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    items: '',
  }
}

// --- 3. LIFECYCLE HOOKS ---

// Lấy thông tin User để điền vào Form
const getProfile = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // Nếu lỗi token -> đá về login
    if (error || !user) {
      await supabase.auth.signOut()
      router.push('/login')
      return
    }

    // Nếu ok -> Điền tên/sđt người gửi
    if (user) {
      const meta = user.user_metadata || {}
      form.value.senderName = meta.full_name || 'Khách hàng'
      form.value.senderPhone = user.phone || meta.phone || ''
    }
  } catch (error) {
    console.error(error)
    router.push('/login')
  }
}

// Hook chạy khi mới vào trang lần đầu
onMounted(() => {
  getProfile()
})

// Hook chạy khi rời khỏi trang (Route change)
onBeforeRouteLeave((to, from, next) => {
  resetState()
  next()
})

// Hook chạy khi Component bị ẩn (Chuyển Tab Dashboard)
onDeactivated(() => {
  resetState()
})

// Hook chạy khi quay lại Component (Active lại Tab)
onActivated(() => {
  // Reset trước để đảm bảo sạch sẽ
  resetState()
  // Sau đó lấy lại thông tin user để điền cho tiện
  getProfile()
  // Check resume order
  checkResumeOrder()
})

const route = useRoute()

const checkResumeOrder = async () => {
  const resumeId = route.query.resumeOrder
  if (!resumeId) return

  isLoadingPage.value = true
  try {
     const { data, error } = await supabase.from('orders').select('*').eq('id', resumeId).single()
     if (error || !data) return
     if (data.status !== 'waiting_payment') return

     // Populate Form
     form.value.senderName = data.sender_name
     form.value.senderPhone = data.sender_phone
     form.value.receiverName = data.receiver_name
     form.value.receiverPhone = data.receiver_phone
     form.value.pickupAddress = data.pickup_address
     form.value.dropoffAddress = data.dropoff_address
     form.value.paymentMethod = data.payment_method
     form.value.note = data.note
     
     // Parse note for items/house details if simpler text format isn't used
     // Assuming simple restoration for now or parsing if needed. 
     // Since Note is a string: "..." we might need to be careful if we rely on it for UI "Items selected".
     // For now, let's trust the text fields are most important for the QR.
     
     // Force Step 3
     currentStep.value = 3
     activeQRId.value = data.id 
     isShowQR.value = true
     
     // Trigger Map Init if needed (though QR hides map)
     
     // Recalculate distance/price from DB or re-run logic? 
     // Better to use price from DB for consistency
     // We can override totalPrice computed if we want, OR just let user re-verify. 
     // But to show correct QR amount, we need the price.
     // Let's rely on standard logic -> We need coords to calculate distance to calculate price.
     // So we simply set addresses and trigger fetch?
     // Better: just fetch coords from nominatim again or store them? DB doesn't have coords.
     // We will try to fetch coords from addresses to restore distance.
     if (form.value.pickupAddress) await fetchNominatim(form.value.pickupAddress, 'pickup')
     if (form.value.dropoffAddress) await fetchNominatim(form.value.dropoffAddress, 'dropoff')
     // select first result logic? Or just use address string.
     // Actually, without coords, we can't show map path. 
     // Let's try to geocode the addresses.
     
     await restoreCoordsFromAddress(form.value.pickupAddress, 'pickup')
     await restoreCoordsFromAddress(form.value.dropoffAddress, 'dropoff')
     
     if (coords.value.pickup && coords.value.dropoff) {
       await calculateRoute()
     }

     // Simulate smooth loading for 0.3s
     await new Promise(resolve => setTimeout(resolve, 300))

  } catch (e) {
    console.error(e)
  } finally {
    isLoadingPage.value = false
  }
}

const restoreCoordsFromAddress = async (address: string, type: 'pickup' | 'dropoff') => {
  if (!address) return
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
  try {
     const res = await fetch(url)
     const data = await res.json()
     if (data && data.length > 0) {
        const item = data[0]
        const lat = parseFloat(item.lat)
        const lon = parseFloat(item.lon)
        if (type === 'pickup') coords.value.pickup = [lat, lon]
        else coords.value.dropoff = [lat, lon]
     }
  } catch {}
}

// Dọn dẹp khi hủy component
onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

// --- 4. LOGIC VALIDATION ---
const validateStep = (step: number) => {
  let isValid = true

  if (step === 1) {
    errors.value.senderName = ''
    errors.value.senderPhone = ''
    errors.value.receiverName = ''
    errors.value.receiverPhone = ''

    if (!form.value.senderName.trim()) {
      errors.value.senderName = 'Vui lòng nhập tên'
      isValid = false
    }
    if (!form.value.senderPhone) {
      errors.value.senderPhone = 'Vui lòng nhập SĐT'
      isValid = false
    } else if (!/^\d{10}$/.test(form.value.senderPhone)) {
      errors.value.senderPhone = 'SĐT phải có 10 số'
      isValid = false
    }

    // Người nhận (Bắt buộc nhập, không auto-fill)
    if (!form.value.receiverName.trim()) {
      errors.value.receiverName = 'Vui lòng nhập tên người nhận'
      isValid = false
    }
    if (!form.value.receiverPhone) {
      errors.value.receiverPhone = 'Vui lòng nhập SĐT'
      isValid = false
    } else if (!/^\d{10}$/.test(form.value.receiverPhone)) {
      errors.value.receiverPhone = 'SĐT phải có 10 số'
      isValid = false
    }
  }

  if (step === 2) {
    errors.value.items = ''
    if (form.value.items.length === 0) {
      errors.value.items = 'Vui lòng chọn ít nhất 1 món đồ'
      isValid = false
    }
  }

  return isValid
}

// --- 5. LOGIC BẢN ĐỒ & TÌM KIẾM ---
const fetchNominatim = async (query: string, type: 'pickup' | 'dropoff') => {
  if (!query || query.length < 2) return
  if (type === 'pickup') isSearchingPickup.value = true
  else isSearchingDropoff.value = true

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=vi`
    const res = await fetch(url)
    const data = await res.json()

    if (type === 'pickup') pickupSuggestions.value = data
    else dropoffSuggestions.value = data
  } catch (e) {
    console.error(e)
  } finally {
    if (type === 'pickup') isSearchingPickup.value = false
    else isSearchingDropoff.value = false
  }
}

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
  isSelecting.value = true
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
  map = L.map('mapMoving').setView([21.0285, 105.8542], 13)
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
    .bindPopup('🏠 Nhà cũ')
    .openPopup()
  const endMarker = L.marker(end, { icon: dropoffIcon }).addTo(map!).bindPopup('🚩 Nhà mới')
  markers.push(startMarker, endMarker)

  const group = new L.FeatureGroup(markers)
  map!.fitBounds(group.getBounds().pad(0.1))

  try {
    const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=false`
    const res = await fetch(url)
    const data = await res.json()
    if (data.code === 'Ok' && data.routes.length) {
      distance.value = parseFloat((data.routes[0].distance / 1000).toFixed(1))
    } else {
      throw new Error('No route')
    }
  } catch (e) {
    const R = 6371
    const dLat = (end[0] - start[0]) * (Math.PI / 180)
    const dLon = (end[1] - start[1]) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(start[0] * (Math.PI / 180)) *
        Math.cos(end[0] * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    distance.value = parseFloat((R * c * 1.3).toFixed(1))
  } finally {
    isCalculating.value = false
  }
}

// --- 6. LOGIC TÍNH GIÁ ---
const totalPrice = computed(() => {
  if (!distance.value) return 0
  let total = 350000
  total += distance.value * 15000
  total += form.value.items.length * 50000
  if (!form.value.hasElevator) total += 200000
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

const nextStep = () => {
  if (!validateStep(currentStep.value)) return
  if (currentStep.value < 3) currentStep.value++
}
const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}

// --- 7. SUBMIT ---
const handleSubmit = async () => {
  if (isSubmitting.value) return
  // 1. Nếu là Online và chưa có đơn (chưa hiện QR) -> Tạo đơn waiting_payment
  if (form.value.paymentMethod === 'online' && !isShowQR.value) {
    isSubmitting.value = true
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { alert('Bạn cần đăng nhập!'); isSubmitting.value = false; return }

        const detailedNote = `
          [CHUYỂN NHÀ TRỌN GÓI]
          - Loại nhà: ${form.value.houseType}
          - Thang máy: ${form.value.hasElevator ? 'Có' : 'Không'}
          - Đồ đạc (${form.value.items.length} món): ${form.value.items.join(', ')}
          - Ghi chú thêm: ${form.value.note}
        `.trim()

        const { data, error } = await supabase.from('orders').insert({
          user_id: user.id,
          order_code: `MV-${Math.floor(100000 + Math.random() * 900000)}`,
          service_type: 'moving',
          pickup_address: form.value.pickupAddress,
          dropoff_address: form.value.dropoffAddress,
          total_price: totalPrice.value,
          status: 'waiting_payment', // <--- QUAN TRỌNG
          sender_name: form.value.senderName,
          sender_phone: form.value.senderPhone,
          receiver_name: form.value.receiverName,
          receiver_phone: form.value.receiverPhone,
          note: detailedNote,
          payment_method: form.value.paymentMethod,
        }).select().single()

        if (error) throw error
        
        activeQRId.value = data.id
        isShowQR.value = true
    } catch (e: any) {
        alert('Lỗi: ' + e.message)
    } finally {
        isSubmitting.value = false
    }
    return
  }

  // 2. Nếu ĐÃ có đơn (đang hiện QR) và user bấm "Đã thanh toán" -> Update thành processing
  if (form.value.paymentMethod === 'online' && isShowQR.value && activeQRId.value) {
      isSubmitting.value = true
      try {
          const { error } = await supabase.from('orders')
            .update({ status: 'processing' })
            .eq('id', activeQRId.value)
          
          if (error) throw error
          
          // Success
          isShowQR.value = false
          activeQRId.value = null
          currentStep.value = 4
      } catch (e: any) {
          alert('Lỗi cập nhật: ' + e.message)
      } finally {
          isSubmitting.value = false
      }
      return
  }

  // 3. Nếu là COD -> Tạo đơn processing luôn
  isSubmitting.value = true
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      alert('Bạn cần đăng nhập!')
      isSubmitting.value = false
      return
    }

    const detailedNote = `
      [CHUYỂN NHÀ TRỌN GÓI]
      - Loại nhà: ${form.value.houseType}
      - Thang máy: ${form.value.hasElevator ? 'Có' : 'Không'}
      - Đồ đạc (${form.value.items.length} món): ${form.value.items.join(', ')}
      - Ghi chú thêm: ${form.value.note}
    `.trim()

    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      order_code: `MV-${Math.floor(100000 + Math.random() * 900000)}`,
      service_type: 'moving',
      pickup_address: form.value.pickupAddress,
      dropoff_address: form.value.dropoffAddress,
      total_price: totalPrice.value,
      status: 'processing',
      sender_name: form.value.senderName,
      sender_phone: form.value.senderPhone,
      receiver_name: form.value.receiverName,
      receiver_phone: form.value.receiverPhone,
      note: detailedNote,
      payment_method: form.value.paymentMethod,
    })

    if (error) throw error

    isShowQR.value = false
    currentStep.value = 4
  } catch (error: any) {
    console.error(error)
    alert('Lỗi: ' + error.message)
    isSubmitting.value = false
  }
}

const cancelQR = async () => {
  // Nếu huỷ khi đang thanh toán online -> Huỷ đơn waiting_payment
  if (activeQRId.value) {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', activeQRId.value)
      activeQRId.value = null
  }
  isShowQR.value = false
  nextTick(() => {
    map?.remove()
    map = null
    initMap()
    if (coords.value.pickup && coords.value.dropoff) calculateRoute()
  })
}

const goOrderList = async () => {
  isLoadingPage.value = true
  await new Promise((resolve) => setTimeout(resolve, 300))
  // Reset trước khi chuyển trang
  resetState()
  router.push('/dashboard/order-list')
}
</script>

<template>
  <main class="flex-1 md:ml-64 p-6 lg:p-10 bg-gray-50 min-h-screen flex flex-col">
    <header class="mb-8">
      <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <Home class="w-6 h-6 text-emerald-600" /> Chuyển nhà Trọn gói
      </h2>
      <p class="text-slate-500 mt-1">Dịch vụ đóng gói, vận chuyển và lắp đặt chuyên nghiệp.</p>
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
        <span>Liên lạc</span><span>Đồ đạc</span><span>Lộ trình</span><span>Hoàn tất</span>
      </div>
    </div>

    <div class="flex-1 flex flex-col max-w-3xl mx-auto w-full">
      <div
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8 flex-1 flex flex-col"
      >
        <div v-if="currentStep === 1" class="space-y-8 animate-fade-in">
          <div class="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 class="text-lg font-bold text-slate-800">Thông tin liên hệ</h3>
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
                Tại điểm đi (Nhà cũ)
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
                      'w-full pl-3 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none transition-all',
                      errors.senderName
                        ? 'border-red-500 bg-red-50'
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
                    type="tel"
                    maxlength="10"
                    @focus="clearError('senderPhone')"
                    :class="[
                      'w-full pl-3 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none transition-all',
                      errors.senderPhone
                        ? 'border-red-500 bg-red-50'
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
                Tại điểm đến (Nhà mới)
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
                      'w-full pl-3 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none transition-all',
                      errors.receiverName
                        ? 'border-red-500 bg-red-50'
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
                    type="tel"
                    maxlength="10"
                    @focus="clearError('receiverPhone')"
                    :class="[
                      'w-full pl-3 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none transition-all',
                      errors.receiverPhone
                        ? 'border-red-500 bg-red-50'
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
            <h3 class="text-lg font-bold text-slate-800">Thông tin đồ đạc & Nhà ở</h3>
            <span class="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md"
              >Bước 2/4</span
            >
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <label class="text-sm font-bold text-slate-700 block">Đặc điểm nơi chuyển đi</label>
              <div class="grid grid-cols-1 gap-3">
                <select
                  v-model="form.houseType"
                  class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                >
                  <option value="apartment">Chung cư / Tập thể</option>
                  <option value="alley">Nhà trong ngõ nhỏ (Xe tải khó vào)</option>
                  <option value="street">Nhà mặt phố (Xe đỗ cửa)</option>
                </select>
                <label
                  class="flex items-center cursor-pointer gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                >
                  <div class="relative">
                    <input type="checkbox" v-model="form.hasElevator" class="sr-only peer" />
                    <div
                      class="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 transition-colors"
                    ></div>
                    <div
                      class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"
                    ></div>
                  </div>
                  <span class="text-sm font-medium text-slate-700">Có thang máy vận chuyển</span>
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700 block">Ghi chú thêm</label>
              <textarea
                v-model="form.note"
                placeholder="Ví dụ: Cần bọc kỹ gương, chuyển vào giờ hành chính..."
                class="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none resize-none"
              ></textarea>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Sofa class="w-4 h-4 text-emerald-600" /> Chọn đồ đạc cồng kềnh (Để ước lượng xe)
              <span class="text-red-500">*</span>
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                v-for="item in commonItems"
                :key="item"
                @click="toggleItem(item)"
                :class="[
                  'p-3 rounded-xl border text-sm font-medium transition flex flex-col items-center justify-center gap-2 text-center h-24',
                  form.items.includes(item)
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-500'
                    : 'border-gray-200 hover:border-emerald-300 text-slate-600 bg-white hover:bg-gray-50',
                ]"
              >
                <CheckSquare v-if="form.items.includes(item)" class="w-5 h-5 text-emerald-500" />
                <span v-else class="w-5 h-5 block"></span>
                {{ item }}
              </button>
            </div>
            <p v-if="errors.items" class="text-red-500 text-xs mt-2">{{ errors.items }}</p>
          </div>
        </div>

        <div v-else-if="currentStep === 3" class="space-y-6 flex flex-col flex-1 animate-fade-in">
          <template v-if="!isShowQR">
            <div class="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 class="text-lg font-bold text-slate-800">Lộ trình & Báo giá</h3>
              <span class="text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md"
                >Bước 3/4</span
              >
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-1 relative z-[1001]">
                <label class="text-xs font-bold text-emerald-600 uppercase ml-1"
                  >Địa chỉ nhà cũ</label
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
                    }}</span>
                    <span class="text-xs text-slate-500 truncate">{{ item.display_name }}</span>
                  </div>
                </div>
              </div>

              <div class="space-y-1 relative z-[1000]">
                <label class="text-xs font-bold text-orange-500 uppercase ml-1"
                  >Địa chỉ nhà mới</label
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
                    }}</span>
                    <span class="text-xs text-slate-500 truncate">{{ item.display_name }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="relative rounded-2xl overflow-hidden border border-gray-200 h-64 md:h-80 bg-slate-100 shadow-inner z-0"
            >
              <div id="mapMoving" class="w-full h-full z-0"></div>
              <div
                v-if="!distance"
                class="absolute inset-0 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center z-[500] p-4 text-center"
              >
                <button
                  @click="calculateRoute"
                  class="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:scale-105 shadow-xl transition-all"
                >
                  <Calculator v-if="!isCalculating" class="w-4 h-4" />
                  {{ isCalculating ? 'Đang tính toán...' : 'Xem lộ trình & Báo giá' }}
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
                    <p class="text-sm text-emerald-700">Khoảng cách</p>
                    <p class="text-2xl font-bold text-emerald-900">{{ distance }} km</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-emerald-700">Trọn gói (Dự kiến)</p>
                    <p class="text-3xl font-extrabold text-emerald-600">
                      {{ totalPrice.toLocaleString('vi-VN') }}đ
                    </p>
                  </div>
                </div>
                <div class="space-y-1.5 text-xs text-emerald-800">
                  <div class="flex justify-between">
                    <span>Xe tải & Tài xế (Mở cửa):</span><span class="font-medium">350.000đ</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Phí vận chuyển ({{ distance }}km):</span
                    ><span class="font-medium">{{ (distance * 15000).toLocaleString() }}đ</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Phí đồ đạc ({{ form.items.length }} món lớn):</span
                    ><span class="font-medium"
                      >{{ (form.items.length * 50000).toLocaleString() }}đ</span
                    >
                  </div>
                  <div class="flex justify-between">
                    <span>Phí thang bộ:</span>
                    <span class="font-medium">{{
                      form.hasElevator ? '0đ (Có thang máy)' : '200.000đ'
                    }}</span>
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
                      <Wallet class="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p class="font-bold text-sm">Tiền mặt</p>
                      <p class="text-xs opacity-70">Thanh toán sau khi xong</p>
                    </div>
                    <CheckCircle
                      v-if="form.paymentMethod === 'cod'"
                      class="ml-auto w-5 h-5 text-emerald-600"
                    />
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
                      <CreditCard class="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p class="font-bold text-sm">Chuyển khoản</p>
                      <p class="text-xs opacity-70">VNPAY / Banking</p>
                    </div>
                    <CheckCircle
                      v-if="form.paymentMethod === 'online'"
                      class="ml-auto w-5 h-5 text-emerald-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="flex flex-col items-center justify-center text-center animate-fade-in py-6">
              <h3 class="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                <QrCode class="w-6 h-6 text-emerald-600" /> Quét mã để đặt cọc
              </h3>
              <p class="text-slate-500 mb-6 max-w-sm">
                Dịch vụ chuyển nhà yêu cầu thanh toán trước hoặc đặt cọc để giữ xe.
              </p>
              <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-lg mb-6 relative">
                <img
                  :src="`https://img.vietqr.io/image/MB-0333053420-compact.jpg?amount=${totalPrice}&addInfo=MOVING ${form.senderPhone}`"
                  alt="QR Code"
                  class="w-64 h-64 object-contain"
                />
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
                  ><span class="font-bold text-slate-800">MOVING {{ form.senderPhone }}</span>
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
                  @click="handleSubmit"
                  class="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-bold transition shadow-lg"
                >
                  <CheckCircle class="w-4 h-4" /> Đã thanh toán
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
            <Truck class="w-10 h-10 text-emerald-600" />
          </div>
          <h3 class="text-2xl font-bold text-slate-900 mb-2">Đã đặt lịch chuyển nhà!</h3>
          <p class="text-slate-500 mb-8 max-w-md">
            Chúng tôi đã nhận được yêu cầu. Đội ngũ khảo sát & vận chuyển sẽ gọi cho bạn trong ít
            phút để xác nhận.
          </p>

          <div
            class="bg-slate-50 p-6 rounded-2xl w-full max-w-md mb-8 border border-slate-100 text-left space-y-3"
          >
            <h4 class="font-bold text-slate-800 border-b pb-2 mb-2">Thông tin đơn hàng</h4>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Người liên hệ:</span
              ><span class="font-medium text-slate-800">{{ form.senderName }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Loại xe:</span
              ><span class="font-medium text-slate-800">Xe tải chuyên dụng</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Tổng chi phí:</span
              ><span class="font-bold text-emerald-600">{{ totalPrice.toLocaleString() }}đ</span>
            </div>
          </div>

          <button
            @click="goOrderList"
            class="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg transition"
          >
            <Package class="w-4 h-4" /> Quản lý đơn hàng
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
        <div v-else></div>
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
          :disabled="!distance || isSubmitting"
          class="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span
            v-if="isSubmitting"
            class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
          ></span>
          <span v-else>Xác nhận đặt lịch</span>
        </button>
      </div>
    </div>
  </main>

  <Transition name="fade">
    <div
      v-if="isLoadingPage"
      class="fixed inset-0 z-[9999] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center"
    >
      <div
        class="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"
      ></div>
      <p class="mt-4 text-slate-600 font-medium">Đang xử lý...</p>
    </div>
  </Transition>
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
