import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/supabase'

// 1. Trang chủ giữ nguyên import tĩnh
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: HomeView,
      meta: { guestOnly: true },
    },
    {
      path: '/login',
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

    // --- KHU VỰC SỬA ĐỔI ---
    {
      path: '/dashboard',
      component: () => import('@/dashboard/DashboardPage.vue'),
      children: [
        {
          path: '',
          component: () => import('@/dashboard/DashboardView.vue'),
        },
        {
          path: 'profile',
          component: () => import('@/dashboard/DashboardProfile.vue'),
        },
        // --- THÊM 2 ROUTE NÀY ---
        {
          path: 'services/delivery',
          component: () => import('@/dashboard/DeliveryPage.vue'),
        },
        {
          path: 'services/moving-house',
          component: () => import('@/dashboard/MovingHousePage.vue'),
        },
      ],
    },
    // --- HẾT KHU VỰC SỬA ĐỔI ---

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

// Giữ nguyên logic bảo vệ route
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
