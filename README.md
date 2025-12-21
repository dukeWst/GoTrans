# GoTrans - Nền Tảng Dịch Vụ Vận Chuyển

GoTrans là một ứng dụng web hiện đại được phát triển để cung cấp các dịch vụ vận chuyển và chuyển nhà, kết nối khách hàng với các tài xế một cách nhanh chóng và tiện lợi.

## 🌟 Tính Năng Chính

Dự án bao gồm các tính năng cốt lõi sau:

### 1. Xác Thực Người Dùng (Authentication)

- **Đăng ký & Đăng nhập**: Hỗ trợ đăng ký và đăng nhập tài khoản người dùng thông qua Supabase/Firebase.
- **Xác thực Email**: Quy trình xác minh email người dùng (`/verify-email`).
- **Phân quyền**: Cơ chế bảo vệ route cho khách (Guest) và người dùng đã đăng nhập (User).

### 2. Dịch Vụ (Services)

- **Giao Hàng (Delivery Service)**: Tính năng đặt dịch vụ giao hàng nhanh.
- **Chuyển Nhà (Moving House Service)**: Tính năng đặt dịch vụ chuyển nhà trọn gói.

### 3. Bảng Điều Khiển (Dashboard)

- **Tổng quan (Overview)**: Xem thông tin chung và trạng thái hoạt động.
- **Hồ Sơ (Profile)**: Quản lý thông tin cá nhân.
- **Danh Sách Đơn Hàng (Order List)**: Theo dõi lịch sử và trạng thái đơn hàng.
- **Cài Đặt (Settings)**: Tùy chỉnh cấu hình tài khoản.

### 4. Bản Đồ & Định Vị

- Tích hợp **Leaflet** và **Google Maps** để hiển thị bản đồ, định vị và lộ trình.

### 5. Đa Ngôn Ngữ (i18n)

- Hỗ trợ đa ngôn ngữ với `vue-i18n`.

## 🛠 Công Nghệ Sử Dụng

Dự án được xây dựng dựa trên các công nghệ tiên tiến nhất hiện nay:

| Danh mục             | Công nghệ                                | Phiên bản |
| :------------------- | :--------------------------------------- | :-------- |
| **Framework**        | [Vue 3](https://vuejs.org/)              | ^3.5.25   |
| **Build Tool**       | [Vite](https://vitejs.dev/)              | ^7.2.4    |
| **Styling**          | [Tailwind CSS](https://tailwindcss.com/) | ^4.1.18   |
| **State Management** | [Pinia](https://pinia.vuejs.org/)        | ^3.0.4    |
| **Routing**          | [Vue Router](https://router.vuejs.org/)  | ^4.6.4    |
| **Backend / Auth**   | [Supabase](https://supabase.com/)        | ^2.87.1   |
| **Map Integration**  | [Leaflet](https://leafletjs.com/)        | ^1.9.4    |
| **Icons**            | [Lucide Vue](https://lucide.dev/)        | ^0.561.0  |
| **Code Quality**     | ESLint, Prettier                         | -         |

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu cầu tiên quyết

- [Node.js](https://nodejs.org/) (Phiên bản dự kiến: ^20.19.0 hoặc >=22.12.0)
- Trình quản lý gói `npm` hoặc `yarn`.

### Bước 1: Clone dự án

```bash
git clone https://github.com/username/gotrans.git
cd gotrans
```

### Bước 2: Cài đặt dependencies

```bash
npm install
```

### Bước 3: Cấu hình biến môi trường

Tạo file `.env` tại thư mục gốc và điền các thông tin cấu hình cần thiết (như API Key của Supabase/Firebase, Google Maps, v.v.).

### Bước 4: Chạy môi trường phát triển (Development)

```bash
npm run dev
```

Truy cập ứng dụng tại: `http://localhost:5173`

### Bước 5: Build cho môi trường sản xuất (Production)

```bash
npm run build
```

## 📂 Cấu Trúc Thư Mục

```
GoTrans/
├── public/              # Tài nguyên tĩnh (favicon, images,...)
├── src/
│   ├── assets/          # Assets (CSS, images, fonts)
│   ├── auth/            # Các component và view liên quan đến xác thực (Login, Signup)
│   ├── components/      # Các component tái sử dụng (Header, Footer, Button,...)
│   ├── dashboard/       # Giao diện Dashboard và các trang con
│   ├── contact/         # Trang liên hệ
│   ├── router/          # Cấu hình Vue Router
│   ├── stores/          # Pinia stores (quản lý state)
│   ├── user/            # Quản lý thông tin user
│   ├── views/           # Các trang chính (Home, About,...)
│   ├── App.vue          # Component gốc
│   ├── main.ts          # Entry point của ứng dụng
│   └── supabase.ts      # Cấu hình kết nối Supabase
├── .env                 # Biến môi trường
├── index.html           # File HTML chính
├── package.json         # Danh sách dependencies và scripts
├── README.md            # Tài liệu dự án
└── vite.config.ts       # Cấu hình Vite
```

## 🤝 Đóng Góp

Mọi đóng góp đều được hoan nghênh. Vui lòng tạo Pull Request hoặc mở Issue để thảo luận về các thay đổi.

---

© 2025 GoTrans Project.
