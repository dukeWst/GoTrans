<template>
  <div class="min-h-screen flex flex-col bg-gray-50 text-slate-800">
    <Navbar />
    <main class="flex-1 container mx-auto px-6 py-12">
      <Hero />
      <div class="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div class="lg:col-span-2">
          <BookingForm />
        </div>
        <aside>
          <Services />
        </aside>
      </div>
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Navbar from './components/Navbar.vue'
import Hero from './components/Hero.vue'
import BookingForm from './components/BookingForm.vue'
import Services from './components/Services.vue'
import Footer from './components/Footer.vue'
</script>

<style scoped>
/* small component-scoped rules if needed */
</style>
