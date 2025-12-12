import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AuthLogin from '@/auth/AuthLogin.vue'
import AuthSignUp from '../auth/AuthSignUp.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: AuthLogin,
    },
    {
      path: '/register',
      name: 'register',
      component: AuthSignUp,
    },
  ],
})

export default router
