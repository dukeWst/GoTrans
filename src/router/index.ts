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
    { path: '/', component: HomeView },
    { path: '/login', component: AuthLogin },
    { path: '/register', component: AuthSignUp },
    { path: '/verify-phone', component: VerifyPhone },
    { path: '/dashboard', component: DashboardView, meta: { requiresAuth: true } },
  ],
})

router.beforeEach(async (to, _, next) => {
  if (!to.meta.requiresAuth) {
    next()
    return
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    next('/login')
  } else {
    next()
  }
})

export default router
