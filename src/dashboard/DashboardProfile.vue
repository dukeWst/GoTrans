<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabase' // Giả định đường dẫn import
import { User, Mail, Phone, MapPin, Camera, Save, Lock, Shield, Bell } from 'lucide-vue-next'

const router = useRouter()
const loading = ref(true)
const saving = ref(false)

// State cho form
const profile = ref({
  id: '',
  email: '',
  full_name: '',
  phone: '',
  address: '',
  avatar_url: '',
  role: 'member', // member | driver
  join_date: '',
})

// Mock avatar (có thể thay bằng link thật nếu user chưa có avatar)
const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed='

onMounted(async () => {
  await getProfile()
})

const getProfile = async () => {
  try {
    loading.value = true
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Map dữ liệu từ Supabase User Object
    profile.value = {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || '',
      phone: user.user_metadata?.phone || '',
      address: user.user_metadata?.address || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      role: user.user_metadata?.role || 'Khách hàng',
      join_date: new Date(user.created_at).toLocaleDateString('vi-VN'),
    }
  } catch (error) {
    console.error('Error fetching user:', error)
  } finally {
    loading.value = false
  }
}

const updateProfile = async () => {
  try {
    saving.value = true
    // Cập nhật thông tin vào user_metadata của Supabase Auth
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: profile.value.full_name,
        phone: profile.value.phone,
        address: profile.value.address,
      },
    })

    if (error) throw error
    alert('Cập nhật thông tin thành công!')
  } catch (error: any) {
    alert('Lỗi cập nhật: ' + error.message)
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <main class="flex-1 md:ml-64 p-6 lg:p-10">
    <header class="flex justify-between items-center mb-8">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Tài khoản của tôi</h2>
        <p class="text-slate-500 mt-1">Quản lý thông tin cá nhân và bảo mật.</p>
      </div>
    </header>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="space-y-6">
        <div
          class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden"
        >
          <div
            class="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-emerald-500 to-teal-600"
          ></div>

          <div class="relative mt-8 mb-4 group">
            <div
              class="w-28 h-28 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100"
            >
              <img
                :src="profile.avatar_url || defaultAvatar + profile.full_name"
                alt="User Avatar"
                class="w-full h-full object-cover"
              />
            </div>
            <button
              class="absolute bottom-0 right-0 bg-slate-800 text-white p-2 rounded-full hover:bg-slate-700 transition shadow-lg border-2 border-white"
              title="Đổi ảnh đại diện"
            >
              <Camera class="w-4 h-4" />
            </button>
          </div>

          <h3 class="text-xl font-bold text-slate-900">
            {{ profile.full_name || 'Chưa cập nhật tên' }}
          </h3>
          <p class="text-slate-500 text-sm mb-4">{{ profile.email }}</p>

          <div class="flex gap-2 mb-6">
            <span
              class="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 uppercase tracking-wider"
            >
              {{ profile.role }}
            </span>
          </div>

          <div class="w-full border-t border-gray-100 pt-4 text-left">
            <div class="flex justify-between items-center py-2 text-sm">
              <span class="text-slate-500">Tham gia từ</span>
              <span class="font-medium text-slate-700">{{ profile.join_date }}</span>
            </div>
            <div class="flex justify-between items-center py-2 text-sm">
              <span class="text-slate-500">Tổng đơn hàng</span>
              <span class="font-medium text-emerald-600">12</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            class="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition flex items-center gap-3"
          >
            <div class="bg-blue-50 p-2 rounded-lg text-blue-600"><Shield class="w-5 h-5" /></div>
            <span class="font-medium text-slate-700">Chính sách bảo mật</span>
          </div>
          <div class="p-4 hover:bg-gray-50 cursor-pointer transition flex items-center gap-3">
            <div class="bg-orange-50 p-2 rounded-lg text-orange-600">
              <Lock class="w-5 h-5" />
            </div>
            <span class="font-medium text-slate-700">Đổi mật khẩu</span>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2 space-y-8">
        <div class="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User class="w-5 h-5 text-emerald-600" />
              Thông tin cá nhân
            </h3>
          </div>

          <form @submit.prevent="updateProfile" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-sm font-medium text-slate-700">Họ và tên</label>
                <div class="relative">
                  <User class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    v-model="profile.full_name"
                    type="text"
                    class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-slate-800 bg-gray-50/50"
                    placeholder="Nhập họ tên của bạn"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-slate-700">Số điện thoại</label>
                <div class="relative">
                  <Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    v-model="profile.phone"
                    type="tel"
                    class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-slate-800 bg-gray-50/50"
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-slate-700">Email (Không thể thay đổi)</label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  v-model="profile.email"
                  type="email"
                  readonly
                  class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-slate-700">Địa chỉ mặc định</label>
              <div class="relative">
                <MapPin class="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <textarea
                  v-model="profile.address"
                  rows="3"
                  class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-slate-800 bg-gray-50/50 resize-none"
                  placeholder="Nhập địa chỉ của bạn để giao hàng nhanh hơn"
                ></textarea>
              </div>
            </div>

            <div class="pt-4 flex justify-end">
              <button
                type="submit"
                :disabled="saving"
                class="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span
                  v-if="saving"
                  class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                ></span>
                <Save v-else class="w-4 h-4" />
                {{ saving ? 'Đang lưu...' : 'Lưu thay đổi' }}
              </button>
            </div>
          </form>
        </div>

        <div class="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
          <h3 class="text-lg font-bold text-slate-900 mb-6">Cài đặt thông báo</h3>
          <div class="space-y-4">
            <div
              class="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-emerald-200 transition bg-gray-50/30"
            >
              <div>
                <p class="font-medium text-slate-800">Cập nhật đơn hàng</p>
                <p class="text-xs text-slate-500">
                  Thông báo khi tài xế nhận đơn hoặc thay đổi trạng thái
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked class="sr-only peer" />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"
                ></div>
              </label>
            </div>

            <div
              class="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-emerald-200 transition bg-gray-50/30"
            >
              <div>
                <p class="font-medium text-slate-800">Khuyến mãi & Ưu đãi</p>
                <p class="text-xs text-slate-500">Nhận thông báo về các mã giảm giá mới nhất</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" />
                <div
                  class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"
                ></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
