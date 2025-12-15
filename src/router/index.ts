import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/supabase'

// 1. Trang chủ giữ nguyên import tĩnh
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { guestOnly: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/auth/AuthLogin.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/auth/AuthSignUp.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/verify-email', // Đổi đường dẫn
      name: 'verify-email',
      component: () => import('@/auth/VerifyEmail.vue'), // Trỏ tới file mới
      meta: { guestOnly: true },
    },

    // --- KHU VỰC DASHBOARD (Yêu cầu đăng nhập) ---
    {
      path: '/dashboard',
      component: () => import('@/dashboard/DashboardPage.vue'),
      // QUAN TRỌNG: Thêm dòng này để chặn người chưa đăng nhập
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard-home',
          component: () => import('@/dashboard/DashboardView.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/dashboard/DashboardProfile.vue'),
        },
        {
          path: 'services/delivery',
          name: 'service-delivery',
          component: () => import('@/dashboard/DeliveryPage.vue'),
        },
        {
          path: 'services/moving-house',
          name: 'service-moving',
          component: () => import('@/dashboard/MovingHousePage.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/dashboard/DashboardSetting.vue'),
        },
        {
          path: 'order',
          name: 'order',
          component: () => import('@/dashboard/DashboardOrder.vue'),
        },
      ],
    },

    // Route 404 (Tùy chọn)
    // { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFound.vue') }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  },
})

// Logic bảo vệ route
router.beforeEach(async (to, _from, next) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 1. Nếu route yêu cầu đăng nhập mà chưa có session -> Chuyển về login
  if (to.matched.some((record) => record.meta.requiresAuth) && !session) {
    next('/login')
    return
  }

  // 2. Nếu route dành cho khách (guestOnly) mà đã có session -> Chuyển vào dashboard
  if (to.matched.some((record) => record.meta.guestOnly) && session) {
    next('/dashboard')
    return
  }

  next()
})

export default router
