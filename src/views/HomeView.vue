<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from './supabase'
import { Truck, Box, ShieldCheck, Clock, Menu, X, MapPin } from 'lucide-vue-next'

// --- State ---
const isMenuOpen = ref(false)
const quoteForm = ref({
  name: '',
  phone: '',
  fromAddress: '',
  toAddress: '',
  serviceType: 'house',
})
const loading = ref(false)

// --- Actions ---
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const submitQuote = async () => {
  loading.value = true
  try {
    // Giả lập gửi dữ liệu lên Supabase
    // const { data, error } = await supabase.from('quotes').insert([quoteForm.value])

    // Demo delay
    await new Promise((r) => setTimeout(r, 1500))

    alert(`Cảm ơn ${quoteForm.value.name}! GoTrans sẽ liên hệ lại trong 5 phút.`)
    quoteForm.value = { name: '', phone: '', fromAddress: '', toAddress: '', serviceType: 'house' }
  } catch (error) {
    console.error(error)
    alert('Có lỗi xảy ra, vui lòng thử lại.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 font-sans text-gray-800">
    <nav class="bg-white shadow-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center gap-2 cursor-pointer">
            <Truck class="h-8 w-8 text-primary" />
            <span class="text-2xl font-bold text-gray-900"
              >Go<span class="text-secondary">Trans</span></span
            >
          </div>

          <div class="hidden md:flex space-x-8 items-center">
            <a href="#services" class="hover:text-primary transition">Dịch vụ</a>
            <a href="#features" class="hover:text-primary transition">Tại sao chọn chúng tôi?</a>
            <a href="#pricing" class="hover:text-primary transition">Bảng giá</a>
            <button
              class="bg-primary text-white px-5 py-2 rounded-full hover:bg-blue-700 transition font-medium shadow-lg shadow-blue-500/30"
            >
              Gọi ngay: 1900 1234
            </button>
          </div>

          <div class="md:hidden flex items-center">
            <button @click="toggleMenu" class="text-gray-600 focus:outline-none">
              <Menu v-if="!isMenuOpen" class="h-6 w-6" />
              <X v-else class="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="isMenuOpen" class="md:hidden bg-white border-t">
        <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <a href="#" class="block px-3 py-2 rounded-md hover:bg-gray-100">Dịch vụ</a>
          <a href="#" class="block px-3 py-2 rounded-md hover:bg-gray-100">Bảng giá</a>
          <a href="#" class="block px-3 py-2 rounded-md hover:bg-gray-100 text-primary font-bold"
            >Hotline: 1900 1234</a
          >
        </div>
      </div>
    </nav>

    <header class="relative bg-white overflow-hidden">
      <div class="max-w-7xl mx-auto">
        <div
          class="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32"
        >
          <main
            class="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28"
          >
            <div class="sm:text-center lg:text-left">
              <h1
                class="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl"
              >
                <span class="block xl:inline">Chuyển nhà trọn gói</span>
                <span class="block text-primary">Nhanh chóng & An toàn</span>
              </h1>
              <p
                class="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0"
              >
                GoTrans cung cấp giải pháp vận chuyển chuyên nghiệp. Đóng gói cẩn thận, vận chuyển
                đúng giờ, giá cả minh bạch. Hãy để chúng tôi gánh vác nỗi lo chuyển nhà giúp bạn.
              </p>

              <div class="mt-8 bg-gray-50 p-6 rounded-xl shadow-inner border border-gray-100">
                <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock class="w-5 h-5 text-secondary" /> Đăng ký tư vấn miễn phí
                </h3>
                <form @submit.prevent="submitQuote" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    v-model="quoteForm.name"
                    required
                    type="text"
                    placeholder="Họ tên của bạn"
                    class="p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  />
                  <input
                    v-model="quoteForm.phone"
                    required
                    type="tel"
                    placeholder="Số điện thoại"
                    class="p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  />
                  <div class="md:col-span-2 grid grid-cols-2 gap-4">
                    <input
                      v-model="quoteForm.fromAddress"
                      placeholder="Điểm đi (Quận/Huyện)"
                      class="p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                    <input
                      v-model="quoteForm.toAddress"
                      placeholder="Điểm đến (Quận/Huyện)"
                      class="p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    :disabled="loading"
                    class="md:col-span-2 bg-secondary text-white font-bold py-3 rounded-lg hover:bg-amber-600 transition flex justify-center items-center"
                  >
                    <span v-if="loading">Đang gửi...</span>
                    <span v-else>Nhận báo giá ngay</span>
                  </button>
                </form>
              </div>
            </div>
          </main>
        </div>
      </div>
      <div
        class="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 bg-blue-100 flex items-center justify-center"
      >
        <img
          class="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full opacity-90"
          src="https://images.unsplash.com/photo-1600518464441-9154a4dea21e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80"
          alt="Moving house"
        />
      </div>
    </header>

    <section id="services" class="py-16 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <h2 class="text-base text-primary font-semibold tracking-wide uppercase">
            Dịch vụ của chúng tôi
          </h2>
          <p
            class="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl"
          >
            Giải pháp vận chuyển toàn diện
          </p>
        </div>

        <div class="mt-10">
          <div class="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div
              class="flex flex-col items-center text-center p-6 border rounded-xl hover:shadow-xl transition duration-300"
            >
              <div
                class="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-primary mb-4"
              >
                <Box class="w-8 h-8" />
              </div>
              <h3 class="text-xl font-medium text-gray-900">Chuyển nhà trọn gói</h3>
              <p class="mt-2 text-base text-gray-500">
                Bao gồm tháo lắp, đóng gói, vận chuyển và sắp xếp lại đồ đạc tại nhà mới.
              </p>
            </div>

            <div
              class="flex flex-col items-center text-center p-6 border rounded-xl hover:shadow-xl transition duration-300"
            >
              <div
                class="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-primary mb-4"
              >
                <Truck class="w-8 h-8" />
              </div>
              <h3 class="text-xl font-medium text-gray-900">Chuyển văn phòng</h3>
              <p class="mt-2 text-base text-gray-500">
                Quy trình chuyên nghiệp, đảm bảo an toàn hồ sơ, thiết bị điện tử, hạn chế gián đoạn
                công việc.
              </p>
            </div>

            <div
              class="flex flex-col items-center text-center p-6 border rounded-xl hover:shadow-xl transition duration-300"
            >
              <div
                class="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-primary mb-4"
              >
                <MapPin class="w-8 h-8" />
              </div>
              <h3 class="text-xl font-medium text-gray-900">Vận chuyển Bắc - Nam</h3>
              <p class="mt-2 text-base text-gray-500">
                Vận chuyển hàng hóa, đồ đạc liên tỉnh với chi phí tối ưu và lộ trình minh bạch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-16 bg-gray-900 text-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
          <div>
            <h2 class="text-3xl font-extrabold mb-4">Tại sao chọn GoTrans?</h2>
            <p class="text-gray-400 mb-8">
              Chúng tôi hiểu rằng mỗi món đồ đều có giá trị với bạn. GoTrans cam kết bảo vệ tài sản
              của bạn như chính tài sản của mình.
            </p>

            <div class="space-y-6">
              <div class="flex">
                <div class="flex-shrink-0">
                  <div
                    class="flex items-center justify-center h-12 w-12 rounded-md bg-secondary text-white"
                  >
                    <ShieldCheck class="w-6 h-6" />
                  </div>
                </div>
                <div class="ml-4">
                  <h3 class="text-lg leading-6 font-medium">Bảo hiểm 100%</h3>
                  <p class="mt-2 text-base text-gray-400">
                    Đền bù 100% giá trị tài sản nếu xảy ra hư hỏng, mất mát trong quá trình vận
                    chuyển.
                  </p>
                </div>
              </div>

              <div class="flex">
                <div class="flex-shrink-0">
                  <div
                    class="flex items-center justify-center h-12 w-12 rounded-md bg-secondary text-white"
                  >
                    <Clock class="w-6 h-6" />
                  </div>
                </div>
                <div class="ml-4">
                  <h3 class="text-lg leading-6 font-medium">Đúng giờ - Nhanh chóng</h3>
                  <p class="mt-2 text-base text-gray-400">
                    Không delay, không cao su. Chúng tôi tôn trọng thời gian của khách hàng.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-10 lg:mt-0 relative">
            <div class="absolute inset-0 bg-primary opacity-20 blur-3xl rounded-full"></div>
            <img
              class="relative rounded-lg shadow-lg border-4 border-gray-700"
              src="https://images.unsplash.com/photo-1580674684081-7617fbf3d745?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
              alt="Moving boxes"
            />
          </div>
        </div>
      </div>
    </section>

    <footer class="bg-white border-t border-gray-200">
      <div
        class="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8"
      >
        <div class="flex justify-center space-x-6 md:order-2">
          <a href="#" class="text-gray-400 hover:text-gray-500">Facebook</a>
          <a href="#" class="text-gray-400 hover:text-gray-500">Zalo</a>
        </div>
        <div class="mt-8 md:mt-0 md:order-1">
          <p class="text-center text-base text-gray-400">
            &copy; 2024 GoTrans Vietnam. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
