<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, onMounted, onActivated } from 'vue'
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
} from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/supabase'

const router = useRouter()
const route = useRoute()

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
const isSubmitting = ref(false)
const isShowQR = ref(false)
const isLoadingPage = ref(false)
const activeQRId = ref<string | null>(null)
let qrSubscription: any = null

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

// --- DỮ LIỆU FORM ---
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
  packageType: 'standard',
})

// --- STATE LƯU LỖI (VALIDATION) ---
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

// --- HÀM MỚI: Dọn dẹp dữ liệu session ---
const clearSessionData = () => {
  try {
    sessionStorage.removeItem('lastDistance')
    sessionStorage.removeItem('lastTotalPrice')
    sessionStorage.removeItem('activePaymentOrderId_delivery')
  } catch (e) {}
}

// --- LOGIC RESET DỮ LIỆU ---
const resetState = () => {
  // QUAN TRỌNG: Xóa sạch dữ liệu trong storage để tránh load lại đơn cũ
  clearSessionData()
  
  currentStep.value = 1
  distance.value = 0
  isCalculating.value = false
  isShowQR.value = false
  activeQRId.value = null

  if (map) {
    map.remove()
    map = null
    markers = []
  }

  // Reset form
  // (Giữ lại thông tin người gửi nếu muốn, ở đây ta reset sạch trừ người gửi sẽ load lại từ profile)
  form.value.receiverName = ''
  form.value.receiverPhone = ''
  form.value.weight = 1
  form.value.type = 'standard'
  form.value.note = ''
  form.value.pickupAddress = ''
  form.value.dropoffAddress = ''
  form.value.paymentMethod = 'cod'
  form.value.packageType = 'standard'

  // Reset tìm kiếm
  pickupQuery.value = ''
  dropoffQuery.value = ''
  pickupSuggestions.value = []
  dropoffSuggestions.value = []
  isSearchingPickup.value = false
  isSearchingDropoff.value = false
  notFoundPickup.value = false
  notFoundDropoff.value = false
  coords.value = { pickup: null, dropoff: null }
}

const restoreLastRoute = () => {
  const saved = sessionStorage.getItem('lastDistance')
  // Chỉ khôi phục nếu KHÔNG phải là resume order và KHÔNG có activeQR
  if (saved && !activeQRId.value && !route.query.resumeOrder) {
    const v = parseFloat(saved)
    if (!isNaN(v) && v > 0) distance.value = v
  }
}

// --- LOGIC VALIDATE ---
const validateStep = (step: number) => {
  let isValid = true

  if (step === 1) {
    errors.value.senderName = ''
    errors.value.senderPhone = ''
    errors.value.receiverName = ''
    errors.value.receiverPhone = ''

    if (!form.value.senderName.trim()) {
      errors.value.senderName = 'Vui lòng nhập họ tên'
      isValid = false
    }
    if (!form.value.senderPhone) {
      errors.value.senderPhone = 'Vui lòng nhập SĐT'
      isValid = false
    } else if (!/^\d{10}$/.test(form.value.senderPhone)) {
      errors.value.senderPhone = 'SĐT phải có 10 số'
      isValid = false
    }

    if (!form.value.receiverName.trim()) {
      errors.value.receiverName = 'Vui lòng nhập họ tên'
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
    errors.value.weight = ''
    if (!form.value.weight) {
      errors.value.weight = 'Nhập khối lượng'
      isValid = false
    } else if (Number(form.value.weight) <= 0) {
      errors.value.weight = 'Phải lớn hơn 0'
      isValid = false
    }
  }

  return isValid
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
    const { data: { user } } = await supabase.auth.getUser()
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
  restorePaymentState()
  if (!activeQRId.value) {
    checkResumeOrder()
  }
  if (!activeQRId.value) restoreLastRoute()
})

onActivated(async () => {
  await restorePaymentState()

  if (route.query.resumeOrder) {
    checkResumeOrder()
    return
  }

  if (!activeQRId.value) {
    resetState() // Reset để đảm bảo form sạch
    getProfile()
    checkResumeOrder()
    restoreLastRoute()
  }
})

const restorePaymentState = async () => {
  const savedOrderId = sessionStorage.getItem('activePaymentOrderId_delivery')
  if (!savedOrderId) return

  try {
    const { data, error } = await supabase.from('orders').select('id,status').eq('id', savedOrderId).single()
    if (error || !data) {
      sessionStorage.removeItem('activePaymentOrderId_delivery')
      return
    }

    if (data.status === 'waiting_payment') {
      activeQRId.value = savedOrderId
      isShowQR.value = true
      currentStep.value = 3
      listenForPaymentConfirmation(savedOrderId)
    } else {
      sessionStorage.removeItem('activePaymentOrderId_delivery')
    }
  } catch (e) {
    console.error('Error restoring payment state', e)
    sessionStorage.removeItem('activePaymentOrderId_delivery')
  }
}

const checkResumeOrder = async () => {
  const resumeId = route.query.resumeOrder
  if (!resumeId) return

  isLoadingPage.value = true
  try {
     const { data, error } = await supabase.from('orders').select('*').eq('id', resumeId).single()
     if (error || !data) return
     if (data.status !== 'waiting_payment') return

     form.value.senderName = data.sender_name
     form.value.senderPhone = data.sender_phone
     form.value.receiverName = data.receiver_name
     form.value.receiverPhone = data.receiver_phone
     form.value.pickupAddress = data.pickup_address
     form.value.dropoffAddress = data.dropoff_address
     form.value.paymentMethod = data.payment_method
     form.value.note = data.note
     form.value.packageType = data.package_type || 'standard'
     form.value.weight = data.weight || 1
     form.value.type = data.service_type || 'standard'

     currentStep.value = 3
     activeQRId.value = data.id 
     isShowQR.value = true
     
     if (data.total_price) {
       const calculatedDistance = (data.total_price - 15000 - form.value.weight * 2000) / 5000
       if (calculatedDistance > 0) {
         distance.value = parseFloat(calculatedDistance.toFixed(1))
       }
     }
     
     await nextTick()
     if (!map) initMap()
     
     if (form.value.pickupAddress) await fetchNominatim(form.value.pickupAddress, 'pickup')
     if (form.value.dropoffAddress) await fetchNominatim(form.value.dropoffAddress, 'dropoff')
     await restoreCoordsFromAddress(form.value.pickupAddress, 'pickup')
     await restoreCoordsFromAddress(form.value.dropoffAddress, 'dropoff')
     
     if (coords.value.pickup && coords.value.dropoff) {
       const start = coords.value.pickup
       const end = coords.value.dropoff
       const startMarker = L.marker(start, { icon: pickupIcon }).addTo(map!).bindPopup('🚚 Điểm lấy').openPopup()
       const endMarker = L.marker(end, { icon: dropoffIcon }).addTo(map!).bindPopup('📦 Điểm giao')
       markers.push(startMarker, endMarker)
       const group = new L.FeatureGroup(markers)
       map!.fitBounds(group.getBounds().pad(0.1))
     }

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

  const startMarker = L.marker(start, { icon: pickupIcon }).addTo(map!).bindPopup('🚚 Điểm lấy').openPopup()
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
      try {
        sessionStorage.setItem('lastDistance', String(distance.value))
        sessionStorage.setItem('lastTotalPrice', String(totalPrice.value))
      } catch (e) {}
    } else {
      throw new Error('No route')
    }
  } catch (e) {
    const straightDistance = calculateDistance(start[0], start[1], end[0], end[1])
    distance.value = parseFloat((straightDistance * 1.3).toFixed(1))
    try {
      sessionStorage.setItem('lastDistance', String(distance.value))
      sessionStorage.setItem('lastTotalPrice', String(totalPrice.value))
    } catch (e) {}
  } finally {
    isCalculating.value = false
  }
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
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
  if (currentStep.value === 3 && !isLoadingPage.value) distance.value = 0
})

const nextStep = () => {
  if (!validateStep(currentStep.value)) return
  if (currentStep.value < 3) currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}

const handleSubmit = async () => {
  if (isSubmitting.value) return

  // ONLINE PAYMENT
  if (form.value.paymentMethod === 'online') {
    if (!isShowQR.value) {
       isSubmitting.value = true
       try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) { alert('Vui lòng đăng nhập!'); isSubmitting.value = false; return }

          const orderCode = `DH-${Math.floor(100000 + Math.random() * 900000)}`
          
          const { data, error } = await supabase.from('orders').insert({
            user_id: user.id,
            order_code: orderCode,
            service_type: form.value.type,
            pickup_address: form.value.pickupAddress,
            dropoff_address: form.value.dropoffAddress,
            total_price: totalPrice.value,
            package_type: form.value.packageType,
            status: 'waiting_payment',
            sender_name: form.value.senderName,
            sender_phone: form.value.senderPhone,
            receiver_name: form.value.receiverName,
            receiver_phone: form.value.receiverPhone,
            weight: form.value.weight,
            note: form.value.note,
            payment_method: form.value.paymentMethod,
          }).select().single()

          if (error) throw error
          activeQRId.value = data.id
          sessionStorage.setItem('activePaymentOrderId_delivery', data.id)
          listenForPaymentConfirmation(data.id)
          isShowQR.value = true
       } catch (e: any) {
          alert('Lỗi tạo đơn: ' + e.message)
       } finally {
          isSubmitting.value = false
       }
       return
    } 

    if (isShowQR.value && activeQRId.value) {
        isSubmitting.value = true
        try {
            const { error } = await supabase.from('orders').update({ status: 'processing' }).eq('id', activeQRId.value)
            if (error) throw error
            finishOrder()
        } catch (e: any) {
            alert('Lỗi cập nhật: ' + e.message)
        } finally {
            isSubmitting.value = false
        }
        return
    }
    return
  }

  // COD PAYMENT
  isSubmitting.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Bạn cần đăng nhập để đặt hàng!'); isSubmitting.value = false; return }

    const orderCode = `DH-${Math.floor(100000 + Math.random() * 900000)}`

    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      order_code: orderCode,
      service_type: form.value.type,
      pickup_address: form.value.pickupAddress,
      dropoff_address: form.value.dropoffAddress,
      total_price: totalPrice.value,
      package_type: form.value.packageType,
      status: 'processing',
      sender_name: form.value.senderName,
      sender_phone: form.value.senderPhone,
      receiver_name: form.value.receiverName,
      receiver_phone: form.value.receiverPhone,
      weight: form.value.weight,
      note: form.value.note,
      payment_method: form.value.paymentMethod,
    })

    if (error) throw error
    
    // THÀNH CÔNG: Dọn dẹp session sạch sẽ
    isShowQR.value = false
    activeQRId.value = null
    clearSessionData()
    currentStep.value = 4
  } catch (error: any) {
    alert('Có lỗi xảy ra: ' + error.message)
  } finally {
     if (currentStep.value !== 4) isSubmitting.value = false
  }
}

const listenForPaymentConfirmation = (orderId: string) => {
  if (qrSubscription) supabase.removeChannel(qrSubscription)
  qrSubscription = supabase.channel(`payment-${orderId}`).on('postgres_changes', { 
       event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}`
    }, (payload: any) => {
       if (payload.new && payload.new.status === 'processing') {
          finishOrder()
       }
    }).subscribe()
}

const finishOrder = () => {
  if (qrSubscription) supabase.removeChannel(qrSubscription)
  isShowQR.value = false
  currentStep.value = 4
  activeQRId.value = null
  // THÀNH CÔNG: Xóa session data
  clearSessionData()
}

const cancelQR = async () => {
  if (qrSubscription) supabase.removeChannel(qrSubscription)
  if (activeQRId.value) {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', activeQRId.value)
      activeQRId.value = null
  }
  clearSessionData() // Hủy thì cũng nên xóa session
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
  resetState() // Reset sạch sẽ trước khi chuyển trang
  await new Promise((resolve) => setTimeout(resolve, 300))
  await router.push('/dashboard/order-list')
}

const createNewOrder = async () => {
  if (qrSubscription) supabase.removeChannel(qrSubscription)
  if (activeQRId.value) {
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', activeQRId.value)
    activeQRId.value = null
  }
  
  resetState() // Gọi resetState để xóa hết session và form
  
  isShowQR.value = false
  currentStep.value = 1
  distance.value = 0
}

onBeforeRouteLeave((to, from, next) => {
  resetState()
  next()
})

onUnmounted(() => {
  if (map) { map.remove(); map = null }
})
</script>

<template>
  <main class="flex-1 md:ml-64 p-6 lg:p-10 bg-gray-50 dark:bg-slate-900 min-h-screen flex flex-col transition-colors duration-300">
    <header class="mb-8">
      <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <Package class="w-6 h-6 text-emerald-600" /> Tạo đơn Giao hàng
      </h2>
      <p class="text-slate-500 mt-1">Dịch vụ vận chuyển nhanh chóng, an toàn.</p>
    </header>

    <div class="mb-8 mx-auto w-full max-w-3xl">
      <div class="flex items-center justify-between relative">
        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-slate-700 -z-10"></div>
        <div
          class="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 dark:bg-emerald-400 transition-all duration-300 -z-10"
          :style="{ width: ((currentStep - 1) / 3) * 100 + '%' }"
        ></div>
        <div
          v-for="step in 4"
          :key="step"
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-4',
            currentStep >= step
              ? 'bg-emerald-600 dark:bg-emerald-500 border-emerald-100 dark:border-emerald-700 text-white'
              : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500',
          ]"
        >
          {{ step }}
        </div>
      </div>
      <div class="flex justify-between mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span>Liên lạc</span><span>Gói hàng</span><span>Lộ trình</span><span>Hoàn tất</span>
      </div>
    </div>

    <div class="flex-1 flex flex-col max-w-3xl mx-auto w-full">
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 lg:p-8 flex-1 flex flex-col"
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
                      'w-full pl-3 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none transition-all',
                      errors.senderName
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400',
                    ]"
                  />
                  <p v-if="errors.senderName" class="text-red-500 dark:text-red-400 text-xs ml-1">
                    {{ errors.senderName }}
                  </p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
                    >SĐT <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="form.senderPhone"
                    @focus="clearError('senderPhone')"
                    type="tel"
                    maxlength="10"
                    :class="[
                      'w-full pl-3 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border rounded-xl focus:outline-none transition-all text-slate-800 dark:text-slate-100',
                      errors.senderPhone
                        ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400',
                    ]"
                  />
                  <p v-if="errors.senderPhone" class="text-red-500 dark:text-red-400 text-xs ml-1">
                    {{ errors.senderPhone }}
                  </p>
                </div>
              </div>
            </div>
            <div class="space-y-5">
              <div
                class="flex items-center gap-2 text-orange-500 dark:text-orange-400 font-bold text-sm uppercase tracking-wider"
              >
                <div class="w-2 h-2 rounded-full bg-orange-500 dark:bg-orange-400"></div>
                Người nhận
              </div>
              <div class="space-y-4">
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1"
                    >Họ tên <span class="text-red-500">*</span></label
                  >
                  <input
                    v-model="form.receiverName"
                    @focus="clearError('receiverName')"
                    :class="[
                      'w-full pl-3 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border rounded-xl focus:outline-none transition-all text-slate-800 dark:text-slate-100',
                      errors.receiverName
                        ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-slate-700 focus:border-orange-500 dark:focus:border-orange-400',
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
                    min="1"
                    :class="[
                      'w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none transition-all',
                      errors.weight
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-emerald-500',
                    ]"
                  />
                </div>
                <p v-if="errors.weight" class="text-red-500 text-xs ml-1">{{ errors.weight }}</p>
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700">Loại kiện hàng</label>

              <div class="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  @click="form.packageType = 'standard'"
                  class="p-3 rounded-xl border font-medium transition-all duration-200"
                  :class="[
                    form.packageType === 'standard'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-gray-200 hover:border-emerald-200 text-slate-600 bg-white',
                  ]"
                >
                  Tiêu chuẩn
                </button>

                <button
                  type="button"
                  @click="form.packageType = 'bulky'"
                  class="p-3 rounded-xl border font-medium transition-all duration-200"
                  :class="[
                    form.packageType === 'bulky'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-gray-200 hover:border-emerald-200 text-slate-600 bg-white',
                  ]"
                >
                  Cồng kềnh
                </button>
              </div>

              <p class="text-xs text-slate-500 mt-1">
                {{
                  form.packageType === 'standard'
                    ? 'Dành cho hàng hóa nhỏ gọn, kích thước thông thường.'
                    : 'Dành cho hàng hóa kích thước lớn, chiếm nhiều diện tích.'
                }}
              </p>
            </div>
            <div class="md:col-span-2">
              <label class="text-sm font-bold text-slate-700 mb-1 block">Ghi chú (Tùy chọn)</label>
              <textarea
                v-model="form.note"
                placeholder="Ghi chú..."
                class="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl focus:border-emerald-500 focus:outline-none"
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
                    class="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl focus:border-emerald-500 dark:focus:border-emerald-400 outline-none shadow-sm text-slate-800 dark:text-slate-100"
                  />
                  <div
                    v-if="isSearchingPickup"
                    class="absolute right-3 top-3 w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"
                  ></div>
                </div>
                <div
                  v-if="pickupSuggestions.length > 0"
                  class="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50"
                >
                  <div
                    v-for="(item, index) in pickupSuggestions"
                    :key="index"
                    @click="selectAddress(item, 'pickup')"
                    class="p-3 hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-300 border-b border-gray-50 dark:border-slate-700 flex flex-col"
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
                  >Điểm giao hàng</label
                >
                <div class="relative group">
                  <MapPin class="absolute left-3 top-3 w-5 h-5 text-orange-500 z-10" />
                  <input
                    v-model="dropoffQuery"
                    type="text"
                    placeholder="Nhập địa chỉ..."
                    class="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl focus:border-orange-500 dark:focus:border-orange-400 outline-none shadow-sm text-slate-800 dark:text-slate-100"
                  />
                  <div
                    v-if="isSearchingDropoff"
                    class="absolute right-3 top-3 w-5 h-5 border-2 border-orange-500/30 border-t-orange-600 rounded-full animate-spin"
                  ></div>
                </div>
                <div
                  v-if="dropoffSuggestions.length > 0"
                  class="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50"
                >
                  <div
                    v-for="(item, index) in dropoffSuggestions"
                    :key="index"
                    @click="selectAddress(item, 'dropoff')"
                    class="p-3 hover:bg-orange-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-300 border-b border-gray-50 dark:border-slate-700 flex flex-col"
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
              class="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 h-64 md:h-80 bg-slate-100 dark:bg-slate-700 shadow-inner z-0"
            >
              <div id="mapContainer" class="w-full h-full z-0"></div>
              <div
                v-if="!distance"
                class="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md flex flex-col items-center justify-center z-[500] p-4 text-center"
              >
                <button
                  @click="calculateRoute"
                  class="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white px-8 py-3 rounded-full font-bold hover:scale-105 dark:hover:bg-slate-600 shadow-xl transition-all"
                >
                  <Calculator v-if="!isCalculating" class="w-4 h-4" />
                  {{ isCalculating ? 'Đang tìm đường...' : 'Xem lộ trình & Giá tiền' }}
                </button>
              </div>
            </div>

            <div v-if="distance > 0" class="space-y-6">
              <div
                class="bg-gradient-to-br from-emerald-50 dark:from-emerald-900/30 to-teal-50 dark:to-teal-900/30 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800 animate-fade-in"
              >
                <div
                  class="flex justify-between items-end mb-4 border-b border-emerald-200/50 dark:border-emerald-700/50 pb-4"
                >
                  <div>
                    <p class="text-sm text-emerald-700 dark:text-emerald-300">Khoảng cách thực</p>
                    <p class="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{{ distance }} km</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-emerald-700 dark:text-emerald-300">Tổng chi phí</p>
                    <p class="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {{ totalPrice.toLocaleString('vi-VN') }}đ
                    </p>
                  </div>
                </div>
                <div class="space-y-1.5 text-xs text-emerald-800 dark:text-emerald-200">
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
              <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <QrCode class="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Quét mã để thanh toán
              </h3>
              <p class="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                Vui lòng sử dụng ứng dụng ngân hàng để quét mã bên dưới. Đơn hàng sẽ tự động hoàn
                tất sau khi thanh toán.
              </p>

              <div
                class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg mb-6 relative"
              >
                <img
                  :src="`https://img.vietqr.io/image/MB-0333053420-compact.jpg?amount=${totalPrice}&addInfo=GOTRANS ${profile.phone}`"
                  alt="QR Code"
                  class="w-64 h-64 object-contain"
                />
              </div>

               <div
                class="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 w-full max-w-md text-left space-y-3 mb-6 border border-slate-100 dark:border-slate-600"
              >
                <div class="flex justify-between border-b border-slate-200 dark:border-slate-600 pb-2">
                  <span class="text-slate-500 dark:text-slate-400 text-sm">Ngân hàng</span
                  ><span class="font-bold text-slate-800 dark:text-slate-100">MB Bank (Quân Đội)</span>
                </div>
                <div class="flex justify-between border-b border-slate-200 dark:border-slate-600 pb-2">
                  <span class="text-slate-500 dark:text-slate-400 text-sm">Số tài khoản</span
                  ><span class="font-bold text-slate-800 dark:text-slate-100">0333053420</span>
                </div>
                <div class="flex justify-between border-b border-slate-200 dark:border-slate-600 pb-2">
                  <span class="text-slate-500 dark:text-slate-400 text-sm">Số tiền</span
                  ><span class="font-bold text-emerald-600 dark:text-emerald-400 text-lg"
                    >{{ totalPrice.toLocaleString() }}đ</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500 dark:text-slate-400 text-sm">Nội dung</span
                  ><span class="font-bold text-slate-800 dark:text-slate-100"
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
                  @click="createNewOrder"
                  class="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-bold transition shadow-lg"
                >
                  <Package class="w-4 h-4" /> Đặt đơn mới
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
            @click="goOrderList"
            class="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg transition"
          >
            <Package class="w-4 h-4" /> Quay về trang danh sách đơn hàng
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
          :disabled="!distance || isSubmitting"
          class="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span
            v-if="isSubmitting"
            class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
          ></span>
          <span v-else>Đặt đơn ngay</span>
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>