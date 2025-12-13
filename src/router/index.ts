import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import AuthLogin from '@/auth/AuthLogin.vue'
import AuthSignUp from '@/auth/AuthSignUp.vue'
import VerifyPhone from '@/auth/VerifyPhone.vue'
import { supabase } from '@/supabase'
import DashboardView from '@/dashboard/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: HomeView,
      // THÊM DÒNG NÀY: Đánh dấu trang chủ cũng chỉ dành cho khách
      meta: { guestOnly: true },
    },
    {
      path: '/login',
      component: AuthLogin,
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      component: AuthSignUp,
      meta: { guestOnly: true },
    },
    {
      path: '/verify-phone',
      component: VerifyPhone,
      meta: { guestOnly: true },
    },
    {
      path: '/dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  // Lấy session hiện tại từ Supabase
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 1. Logic bảo vệ trang Dashboard (requiresAuth)
  // Nếu trang yêu cầu đăng nhập mà chưa có session -> Đá về Login
  if (to.meta.requiresAuth && !session) {
    next('/login')
    return
  }

  // 2. Logic điều hướng trang Khách (guestOnly)
  // Nếu trang chỉ dành cho khách (Home, Login, Register) mà ĐÃ CÓ session -> Đá thẳng vào Dashboard
  if (to.meta.guestOnly && session) {
    next('/dashboard')
    return
  }

  // 3. Các trường hợp còn lại -> Cho phép truy cập bình thường
  next()
})

export default router
