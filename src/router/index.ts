import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/supabase'

// 1. Trang chủ giữ nguyên import tĩnh để load nhanh nhất
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: HomeView,
      meta: { guestOnly: true },
    },
    // 2. CÁC TRANG KHÁC CHUYỂN THÀNH LAZY LOAD
    {
      path: '/login',
      // Chỉ tải file này khi user vào /login
      component: () => import('@/auth/AuthLogin.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      component: () => import('@/auth/AuthSignUp.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/verify-phone',
      component: () => import('@/auth/VerifyPhone.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/dashboard',
      component: () => import('@/dashboard/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    // Xử lý 404 (nếu cần sau này)
    // { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFound.vue') }
  ],
  // Tự động cuộn lên đầu trang khi chuyển route
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  },
})

// ... Giữ nguyên phần router.beforeEach cũ của bạn ...
router.beforeEach(async (to, _from, next) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (to.meta.requiresAuth && !session) {
    next('/login')
    return
  }

  if (to.meta.guestOnly && session) {
    next('/dashboard')
    return
  }

  next()
})

export default router
