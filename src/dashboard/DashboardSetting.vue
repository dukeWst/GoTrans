<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router' // Thêm useRoute
import { supabase } from '@/supabase'
import {
  Settings,
  Shield,
  Lock,
  Bell,
  Globe,
  LogOut,
  Save,
  Trash2,
  ChevronDown,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute() // Khai báo route để lấy query params

const loading = ref(true)
const savingPassword = ref(false)
const savingSettings = ref(false)

// State quản lý Tab
const activeTab = ref('security')
const isMenuOpen = ref(false)

// Map tên tab để hiển thị tiêu đề khi menu đóng
const tabLabels: Record<string, string> = {
  security: 'Bảo mật & Mật khẩu',
  notifications: 'Cài đặt Thông báo',
  general: 'Tùy chọn chung',
}

// Lấy tên tab hiện tại
const currentTabLabel = computed(() => tabLabels[activeTab.value])

const setActiveTab = (tabName: string) => {
  activeTab.value = tabName
  isMenuOpen.value = false
  // Cập nhật URL để đồng bộ (tùy chọn, giúp khi reload vẫn ở đúng tab)
  router.replace({ query: { ...route.query, tab: tabName } })
}

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

// State form Password
const passwordForm = ref({
  new_password: '',
  confirm_password: '',
})

// State Settings
const userSettings = ref({
  order_updates: true,
  promo_notifications: false,
  email_notifications: true,
  sms_notifications: false,
  preferred_language: 'vi',
  theme: 'light',
})

// Xử lý logic khi component được mount
onMounted(async () => {
  // 1. Kiểm tra URL xem có yêu cầu mở tab nào cụ thể không (từ trang Profile chuyển sang)
  const tabParam = route.query.tab as string
  if (tabParam && tabLabels[tabParam]) {
    activeTab.value = tabParam
  }

  // 2. Lấy dữ liệu user
  await fetchUserSettings()
})

// Theo dõi thay đổi trên URL (đề phòng trường hợp điều hướng nội bộ)
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && typeof newTab === 'string' && tabLabels[newTab]) {
      activeTab.value = newTab
    }
  },
)

const fetchUserSettings = async () => {
  try {
    loading.value = true
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    const metadata = user.user_metadata || {}
    userSettings.value = {
      order_updates: metadata.setting_order_updates ?? true,
      promo_notifications: metadata.setting_promo_notifications ?? false,
      email_notifications: metadata.setting_email_notifications ?? true,
      sms_notifications: metadata.setting_sms_notifications ?? false,
      preferred_language: metadata.setting_language || 'vi',
      theme: metadata.setting_theme || 'light',
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
}

const updatePassword = async () => {
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password)
    return alert('Mật khẩu không khớp.')
  if (passwordForm.value.new_password.length < 6) return alert('Mật khẩu quá ngắn.')

  try {
    savingPassword.value = true
    const { error } = await supabase.auth.updateUser({ password: passwordForm.value.new_password })
    if (error) throw error
    alert('Cập nhật mật khẩu thành công!')
    passwordForm.value.new_password = ''
    passwordForm.value.confirm_password = ''
  } catch (error: any) {
    alert('Lỗi: ' + error.message)
  } finally {
    savingPassword.value = false
  }
}

const updateGeneralSettings = async () => {
  try {
    savingSettings.value = true
    const { error } = await supabase.auth.updateUser({
      data: {
        setting_order_updates: userSettings.value.order_updates,
        setting_promo_notifications: userSettings.value.promo_notifications,
        setting_email_notifications: userSettings.value.email_notifications,
        setting_sms_notifications: userSettings.value.sms_notifications,
        setting_language: userSettings.value.preferred_language,
        setting_theme: userSettings.value.theme,
      },
    })
    if (error) throw error
    alert('Lưu cài đặt thành công!')
  } catch (error: any) {
    alert('Lỗi: ' + error.message)
  } finally {
    savingSettings.value = false
  }
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <main class="flex-1 md:ml-64 p-6 lg:p-10">
    <header class="flex justify-between items-center mb-8">
      <div>
        <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings class="w-6 h-6 text-emerald-600" /> Cài đặt chung
        </h2>
        <p class="text-slate-500 mt-1">Quản lý các tùy chọn bảo mật, thông báo và giao diện.</p>
      </div>
    </header>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="space-y-6">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            @click="toggleMenu"
            class="p-4 flex items-center justify-between cursor-pointer lg:cursor-default bg-gray-50 lg:bg-white border-b lg:border-b-0 border-gray-100"
          >
            <h3 class="font-bold text-slate-800 lg:hidden">
              {{ currentTabLabel }}
            </h3>
            <h3 class="hidden lg:block font-bold text-slate-800">Các mục cài đặt</h3>
            <ChevronDown
              class="w-5 h-5 text-slate-500 lg:hidden transition-transform duration-200"
              :class="{ 'rotate-180': isMenuOpen }"
            />
          </div>

          <nav
            class="transition-all duration-300 ease-in-out overflow-hidden lg:block"
            :class="
              isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 lg:max-h-full lg:opacity-100'
            "
          >
            <div
              @click="setActiveTab('security')"
              :class="{
                'bg-emerald-50 border-emerald-500': activeTab === 'security',
                'hover:bg-emerald-50 border-transparent': activeTab !== 'security',
              }"
              class="p-4 cursor-pointer transition flex items-center gap-3 border-l-4"
            >
              <div class="text-orange-600"><Lock class="w-5 h-5" /></div>
              <span class="font-medium text-slate-700">Bảo mật & Mật khẩu</span>
            </div>

            <div
              @click="setActiveTab('notifications')"
              :class="{
                'bg-emerald-50 border-emerald-500': activeTab === 'notifications',
                'hover:bg-emerald-50 border-transparent': activeTab !== 'notifications',
              }"
              class="p-4 cursor-pointer transition flex items-center gap-3 border-l-4"
            >
              <div class="text-blue-600"><Bell class="w-5 h-5" /></div>
              <span class="font-medium text-slate-700">Cài đặt Thông báo</span>
            </div>

            <div
              @click="setActiveTab('general')"
              :class="{
                'bg-emerald-50 border-emerald-500': activeTab === 'general',
                'hover:bg-emerald-50 border-transparent': activeTab !== 'general',
              }"
              class="p-4 cursor-pointer transition flex items-center gap-3 border-l-4"
            >
              <div class="text-purple-600"><Globe class="w-5 h-5" /></div>
              <span class="font-medium text-slate-700">Tùy chọn chung</span>
            </div>
          </nav>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            @click="handleLogout"
            class="p-4 w-full text-left hover:bg-red-50 transition flex items-center gap-3 text-red-600 font-bold"
          >
            <LogOut class="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      <div class="lg:col-span-2 space-y-8">
        <Transition name="fade" mode="out-in">
          <div v-if="activeTab === 'security'" class="space-y-8">
            <div class="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
              <h3
                class="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6 border-b pb-4"
              >
                <Lock class="w-5 h-5 text-orange-600" /> Đổi mật khẩu
              </h3>
              <form @submit.prevent="updatePassword" class="space-y-6">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-slate-700">Mật khẩu mới</label>
                  <input
                    v-model="passwordForm.new_password"
                    type="password"
                    required
                    placeholder="Ít nhất 6 ký tự"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 transition bg-gray-50/50"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
                  <input
                    v-model="passwordForm.confirm_password"
                    type="password"
                    required
                    placeholder="Xác nhận lại"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 transition bg-gray-50/50"
                  />
                </div>
                <div class="flex justify-end pt-2">
                  <button
                    type="submit"
                    :disabled="savingPassword"
                    class="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-200 flex items-center gap-2"
                  >
                    <Save v-if="!savingPassword" class="w-4 h-4" />
                    {{ savingPassword ? 'Đang lưu...' : 'Đổi mật khẩu' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div
            v-else-if="activeTab === 'notifications'"
            class="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100"
          >
            <h3 class="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6 border-b pb-4">
              <Bell class="w-5 h-5 text-blue-600" /> Tùy chọn Thông báo
            </h3>
            <form @submit.prevent="updateGeneralSettings" class="space-y-4">
              <div
                class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/30"
              >
                <div>
                  <p class="font-medium text-slate-800">Cập nhật đơn hàng</p>
                  <p class="text-xs text-slate-500">Thông báo trạng thái đơn hàng.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="userSettings.order_updates"
                    class="sr-only peer"
                  />
                  <div
                    class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"
                  ></div>
                </label>
              </div>
              <div
                class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/30"
              >
                <div>
                  <p class="font-medium text-slate-800">Khuyến mãi</p>
                  <p class="text-xs text-slate-500">Nhận thông tin ưu đãi.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="userSettings.promo_notifications"
                    class="sr-only peer"
                  />
                  <div
                    class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"
                  ></div>
                </label>
              </div>
              <div
                class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/30"
              >
                <div>
                  <p class="font-medium text-slate-800">Email</p>
                  <p class="text-xs text-slate-500">Nhận hóa đơn qua email.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="userSettings.email_notifications"
                    class="sr-only peer"
                  />
                  <div
                    class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"
                  ></div>
                </label>
              </div>
              <div class="pt-6 flex justify-end">
                <button
                  type="submit"
                  :disabled="savingSettings"
                  class="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center gap-2"
                >
                  <Save v-if="!savingSettings" class="w-4 h-4" />
                  {{ savingSettings ? 'Đang lưu...' : 'Lưu cài đặt' }}
                </button>
              </div>
            </form>
          </div>

          <div v-else-if="activeTab === 'general'" class="space-y-8">
            <div class="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
              <h3
                class="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6 border-b pb-4"
              >
                <Globe class="w-5 h-5 text-purple-600" /> Tùy chọn chung
              </h3>
              <form @submit.prevent="updateGeneralSettings" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Ngôn ngữ</label>
                    <select
                      v-model="userSettings.preferred_language"
                      class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 bg-gray-50/50"
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Giao diện</label>
                    <select
                      v-model="userSettings.theme"
                      class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 bg-gray-50/50"
                    >
                      <option value="light">Sáng (Mặc định)</option>
                      <option value="dark">Tối</option>
                    </select>
                  </div>
                </div>
                <div class="pt-4 flex justify-end">
                  <button
                    type="submit"
                    :disabled="savingSettings"
                    class="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center gap-2"
                  >
                    <Save v-if="!savingSettings" class="w-4 h-4" />
                    {{ savingSettings ? 'Đang lưu...' : 'Lưu tùy chọn' }}
                  </button>
                </div>
              </form>
            </div>

            <div class="bg-red-50 rounded-2xl p-6 lg:p-8 border border-red-200">
              <h3 class="text-xl font-bold text-red-700 flex items-center gap-2 mb-4">
                <Trash2 class="w-5 h-5" /> Vùng nguy hiểm
              </h3>
              <p class="text-sm text-red-600 mb-4">
                Thao tác này sẽ xóa vĩnh viễn tài khoản của bạn và không thể hoàn tác.
              </p>
              <button
                class="bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition shadow-md shadow-red-200"
              >
                Xóa vĩnh viễn tài khoản
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Hiệu ứng chuyển đổi tab mượt mà */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
