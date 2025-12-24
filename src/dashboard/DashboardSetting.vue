<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '@/supabase'
import {
  Settings,
  Lock,
  Bell,
  Globe,
  LogOut,
  Save,
  Trash2,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertTriangle // Thêm icon cảnh báo
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const savingPassword = ref(false)
const savingSettings = ref(false)
const userEmail = ref('')

// State cho chức năng Xóa tài khoản
const showDeleteModal = ref(false)
const isDeleting = ref(false)

// State quản lý Tab
const activeTab = ref('security')
const isMenuOpen = ref(false)

// --- TOAST NOTIFICATION ---
const toast = reactive({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error',
})

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 3000)
}

// Computed labels
const tabLabels = computed(() => ({
  security: 'Bảo mật',
  notifications: 'Thông báo',
  general: 'Chung',
}))

const currentTabLabel = computed(
  () => tabLabels.value[activeTab.value as keyof typeof tabLabels.value] || 'Menu',
)

const setActiveTab = (tabName: string) => {
  activeTab.value = tabName
  isMenuOpen.value = false
  router.replace({ query: { ...route.query, tab: tabName } })
}

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

// State form Password
const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const userSettings = ref({
  order_updates: true,
  promo_notifications: false,
  email_notifications: true,
  sms_notifications: false,
  preferred_language: 'vi',
})

// Lifecycle
onMounted(async () => {
  document.documentElement.classList.remove('dark')
  const tabParam = route.query.tab as string
  if (tabParam && ['security', 'notifications', 'general'].includes(tabParam)) {
    activeTab.value = tabParam
  }
  await fetchUserSettings()
})

watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && typeof newTab === 'string') activeTab.value = newTab
  },
)

const fetchUserSettings = async () => {
  try {
    loading.value = true
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }
    
    userEmail.value = user.email || ''
    const metadata = user.user_metadata || {}
    
    userSettings.value = {
      order_updates: metadata.setting_order_updates ?? true,
      promo_notifications: metadata.setting_promo_notifications ?? false,
      email_notifications: metadata.setting_email_notifications ?? true,
      sms_notifications: metadata.setting_sms_notifications ?? false,
      preferred_language: metadata.setting_language || 'vi',
    }
  } catch (error) {
    console.error('Error fetching settings:', error)
  } finally {
    loading.value = false
  }
}

const updatePassword = async () => {
  const { current_password, new_password, confirm_password } = passwordForm.value

  if (!current_password) return showToast('Vui lòng nhập mật khẩu hiện tại', 'error')
  if (new_password !== confirm_password) return showToast('Mật khẩu mới không khớp', 'error')
  if (new_password.length < 6) return showToast('Mật khẩu quá ngắn (tối thiểu 6 ký tự)', 'error')
  if (!userEmail.value) return showToast('Không tìm thấy email. Vui lòng đăng nhập lại.', 'error')

  try {
    savingPassword.value = true
    
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: userEmail.value,
      password: current_password,
    })

    if (reauthError) {
      if (reauthError.message.includes('Invalid login credentials') || reauthError.message.includes('AuthApiError')) {
        return showToast('Mật khẩu hiện tại không chính xác', 'error')
      }
      throw reauthError
    } 

    const { error: updateError } = await supabase.auth.updateUser({ password: new_password })
    if (updateError) throw updateError

    showToast('Cập nhật mật khẩu thành công!', 'success')
    passwordForm.value = { current_password: '', new_password: '', confirm_password: '' }
  } catch (error: any) {
    showToast('Lỗi cập nhật mật khẩu: ' + (error.message || 'Unknown error'), 'error')
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
      },
    })

    if (error) throw error
    showToast('Lưu thay đổi thành công!', 'success')
  } catch (error: any) {
    showToast('Lỗi: ' + error.message, 'error')
  } finally {
    savingSettings.value = false
  }
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}

// --- LOGIC XÓA TÀI KHOẢN ---
const openDeleteModal = () => {
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

const confirmDeleteAccount = async () => {
  try {
    isDeleting.value = true
    
    // Gọi hàm RPC đã tạo ở Bước 1
    const { error } = await supabase.rpc('delete_user_account')
    
    if (error) throw error

    // Sau khi xóa thành công, tiến hành đăng xuất client
    await supabase.auth.signOut()
    
    showToast('Tài khoản đã được xóa vĩnh viễn', 'success')
    
    // Đợi 1 chút để hiển thị toast rồi chuyển trang
    setTimeout(() => {
        router.push('/login')
    }, 1000)

  } catch (error: any) {
    console.error('Delete error:', error)
    showToast('Lỗi khi xóa tài khoản: ' + error.message, 'error')
    isDeleting.value = false
    // Không đóng modal để user thấy lỗi
  }
}
</script>

<template>
  <main class="flex-1 md:ml-64 p-6 lg:p-10 bg-gray-50 min-h-screen relative">
    
    <Transition name="toast">
      <div
        v-if="toast.show"
        class="fixed top-24 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-300"
        :class="toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : 'bg-red-50/90 border-red-200 text-red-800'"
      >
        <CheckCircle v-if="toast.type === 'success'" class="w-5 h-5" />
        <XCircle v-else class="w-5 h-5" />
        <div>
          <h4 class="font-bold text-sm">
            {{ toast.type === 'success' ? 'Thành công' : 'Thất bại' }}
          </h4>
          <p class="text-xs opacity-90">{{ toast.message }}</p>
        </div>
      </div>
    </Transition>

    <header class="flex justify-between items-center mb-8">
      <div>
        <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings class="w-6 h-6 text-emerald-600" /> Cài đặt
        </h2>
        <p class="text-slate-500 mt-1">Quản lý cài đặt tài khoản</p>
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
            <h3 class="hidden lg:block font-bold text-slate-800">
              Menu
            </h3>
            <ChevronDown
              class="w-5 h-5 text-slate-500 lg:hidden transition-transform duration-200"
              :class="{ 'rotate-180': isMenuOpen }"
            />
          </div>

          <nav
            class="transition-all duration-300 ease-in-out overflow-hidden lg:block"
            :class="isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 lg:max-h-full lg:opacity-100'"
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
              <span class="font-medium text-slate-700">Bảo mật</span>
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
              <span class="font-medium text-slate-700">Thông báo</span>
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
              <span class="font-medium text-slate-700">Chung</span>
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
          
          <div v-if="activeTab === 'security'" key="security" class="space-y-8">
             <div class="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
              <h3 class="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6 border-b pb-4">
                <Lock class="w-5 h-5 text-orange-600" /> Đổi mật khẩu
              </h3>
              <form @submit.prevent="updatePassword" class="space-y-6">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-slate-700">Mật khẩu hiện tại</label>
                  <input v-model="passwordForm.current_password" type="password" placeholder="Nhập mật khẩu hiện tại" required class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 focus:outline-none focus:border-emerald-500 transition " />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-slate-700">Mật khẩu mới</label>
                  <input v-model="passwordForm.new_password" type="password" placeholder="Nhập mật khẩu mới" required class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 focus:outline-none focus:border-emerald-500 transition" />
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
                  <input v-model="passwordForm.confirm_password" type="password" required placeholder="Xác nhận mật khẩu mới" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 focus:outline-none focus:border-emerald-500 transition" />
                </div>
                <div class="flex justify-end pt-2">
                  <button type="submit" :disabled="savingPassword" class="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-200 flex items-center gap-2 disabled:opacity-50">
                    <Save v-if="!savingPassword" class="w-4 h-4" />
                    {{ savingPassword ? 'Đang lưu...' : 'Đổi mật khẩu' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div v-else-if="activeTab === 'notifications'" key="notifications" class="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
             <h3 class="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6 border-b pb-4">
              <Bell class="w-5 h-5 text-blue-600" /> Cài đặt Thông báo
            </h3>
            <form @submit.prevent="updateGeneralSettings" class="space-y-4">
              <div class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <div><p class="font-medium text-slate-800">Cập nhật đơn hàng</p></div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="userSettings.order_updates" class="sr-only peer" />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <div class="pt-6 flex justify-end">
                <button type="submit" :disabled="savingSettings" class="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50">
                  <Save v-if="!savingSettings" class="w-4 h-4" />
                  {{ savingSettings ? 'Đang lưu...' : 'Lưu thay đổi' }}
                </button>
              </div>
            </form>
          </div>

          <div v-else-if="activeTab === 'general'" key="general" class="space-y-8">
            <div class="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
               <h3 class="text-xl font-bold text-black flex items-center gap-2 mb-4">
                <Trash2 class="w-5 h-5" /> Tùy chọn chung
              </h3>
              <form @submit.prevent="updateGeneralSettings" class="space-y-6">
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Ngôn ngữ</label>
                    <select v-model="userSettings.preferred_language" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:border-emerald-500 transition">
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700">Giao diện</label>
                    <select class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:border-emerald-500 transition">
                      <option value="light">Sáng</option>
                      <option value="dark">Tối</option>
                    </select>
                  </div>
                </div>
                <div class="pt-4 flex justify-end">
                  <button type="submit" :disabled="savingSettings" class="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-50">
                    <Save v-if="!savingSettings" class="w-4 h-4" />
                    {{ savingSettings ? 'Đang lưu...' : 'Lưu' }}
                  </button>
                </div>
              </form>
            </div>

            <div
              class="bg-red-50 rounded-2xl p-6 lg:p-8 shadow-sm transition-colors border border-red-100"
            >
              <h3
                class="text-xl font-bold text-red-700 flex items-center gap-2 mb-4"
              >
                <Trash2 class="w-5 h-5" /> Xóa tài khoản
              </h3>
              <p class="text-sm text-red-600 mb-6">
                Khi bạn xóa tài khoản, toàn bộ dữ liệu cá nhân, lịch sử đơn hàng và thông tin liên quan sẽ bị xóa vĩnh viễn khỏi hệ thống. Hành động này <span class="font-bold">không thể hoàn tác</span>.
              </p>
              <button
                @click="openDeleteModal"
                class="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200 flex items-center gap-2"
              >
                <Trash2 class="w-4 h-4" />
                Xóa tài khoản
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="showDeleteModal" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeDeleteModal"></div>
        
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-in zoom-in-95 duration-200 border border-gray-100">
          <div class="flex flex-col items-center text-center space-y-4">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle class="w-8 h-8 text-red-600" />
            </div>
            
            <h3 class="text-2xl font-bold text-slate-800">Bạn có chắc chắn?</h3>
            
            <p class="text-slate-600">
              Hành động này sẽ xóa vĩnh viễn tài khoản 
              <span class="font-bold text-slate-900">{{ userEmail }}</span> và toàn bộ dữ liệu. Bạn sẽ không thể khôi phục lại.
            </p>

            <div class="flex gap-3 w-full mt-4">
              <button 
                @click="closeDeleteModal"
                class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold rounded-xl transition"
                :disabled="isDeleting"
              >
                Hủy bỏ
              </button>
              
              <button 
                @click="confirmDeleteAccount"
                class="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition flex items-center justify-center gap-2"
                :disabled="isDeleting"
              >
                <span v-if="isDeleting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>{{ isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

  </main>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>