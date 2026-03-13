# Firebase Authentication Setup Guide

Ứng dụng đã được nâng cấp để sử dụng Firebase Authentication (email/password). Hãy làm theo các bước dưới đây để setup:

## 1. Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo một project mới (hoặc sử dụng project hiện có)
3. Kích hoạt **Authentication > Email/Password**

## 2. Lấy Firebase Configuration (Web App ID)

File `.env.local` đã được setup với config project **prm392-kitchen**.

**Cần hoàn thiện:**
Chỉ còn thêm `NEXT_PUBLIC_FIREBASE_APP_ID` bằng cách:

1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project `prm392-kitchen`
3. Vào **Project Settings** (⚙️ icon)
4. Tab **🔗 Apps** → Chọn ứng dụng Web hoặc tạo mới
5. Copy `appId` từ Firebase SDK snippet

Có dạng như: `1:315695684466:web:abc123def456...`

## 3. Update Environment Variables

Mở `.env.local` và thay thế `YOUR_APP_ID_HERE` bằng giá trị vừa copy:

```env
NEXT_PUBLIC_FIREBASE_APP_ID=1:315695684466:web:your_actual_app_id_here
```

File `.env.local` đã được tạo sẵn với các giá trị khác:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC_Sb0EiyMTvnBfhqQOWMcLN52iMqY219I
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=prm392-kitchen.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=prm392-kitchen
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=prm392-kitchen.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=315695684466
```

Tất cả service backend hiện dùng chung `DEFAULT_API_BASE_URL`
trong `/lib/config/api.ts`.

## 4. Sử dụng

**Đăng nhập hiện tại dùng:**

- Email
- Mật khẩu (tối thiểu 6 ký tự)

**Trang duyệt đơn hàng:**

- Sau khi đăng nhập, truy cập `/dashboard/orders`
- Danh sách đơn từ backend `https://chicken-kitchen.milize-lena.space/api/manager/orders`

## 5. Flow Authorization

1. User đăng nhập qua Firebase (email/password)
2. Firebase cấp ID token
3. App gửi ID token tới `/api/auth/login` backend
4. Backend trả về access token + refresh token
5. Các request sau dùng access token trong header `Authorization: Bearer <token>`

## 6. Tạo Tài Khoản Test

Chạy ứng dụng locally:

```bash
npm run dev
```

Vào `http://localhost:3000` → chuyển đến `/login`:

- Bấm "Đăng ký" để tạo tài khoản mới
- Hoặc dùng email/password đã tạo trước đó

---

**Các file quan trọng:**

- `/lib/firebase.ts` - Firebase config
- `/hooks/use-firebase-auth.ts` - Hook quản lý auth
- `/app/(auth)/login/page.tsx` - Trang đăng nhập
- `/app/(auth)/register/page.tsx` - Trang đăng ký
- `/lib/services/auth-controller.ts` - Gọi backend auth API
