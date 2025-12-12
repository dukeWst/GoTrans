<template>
  <section class="rounded-lg bg-gradient-to-r from-emerald-50 to-white p-8 shadow-sm">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
      <div>
        <h1 class="text-3xl md:text-4xl font-extrabold">
          GoTrans — Dịch vụ chuyển nhà chuyên nghiệp
        </h1>
        <p class="mt-4 text-slate-600">
          Tính toán khoảng cách, báo giá minh bạch và quản lý lịch hẹn dễ dàng. Di chuyển an toàn,
          nhanh chóng.
        </p>

        <div class="mt-6 flex gap-3">
          <a href="#booking" class="bg-emerald-500 text-white px-5 py-3 rounded-md font-medium"
            >Đặt ngay</a
          >
          <a href="#services" class="px-5 py-3 rounded-md border">Xem dịch vụ</a>
        </div>

        <ul class="mt-6 space-y-2 text-sm text-slate-600">
          <li>✅ Tài xế chuyên nghiệp</li>
          <li>✅ Giá theo khoảng cách minh bạch</li>
          <li>✅ Hỗ trợ đóng gói & tháo lắp</li>
        </ul>
      </div>

      <div class="bg-white rounded-lg p-6 shadow-md">
        <div class="text-sm text-slate-500">Ước tính chi phí</div>
        <div class="mt-4">
          <div class="text-2xl font-bold">Từ <span class="text-emerald-500">₫150.000</span></div>
          <div class="text-xs text-slate-400 mt-1">
            (Giá khởi điểm, thay đổi theo khoảng cách & khối lượng)
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts"></script>
