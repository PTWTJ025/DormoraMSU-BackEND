# ไฟล์ที่ไม่ใช้แล้วในระบบใหม่

## ภาพรวมการเปลี่ยนแปลง
ระบบใหม่เปลี่ยนจากการให้ผู้ใช้ลงทะเบียนและเพิ่มข้อมูลหอพักเอง มาเป็นการให้คนทั่วไปกรอกข้อมูลผ่านฟอร์ม แล้วให้แอดมินตรวจสอบและอนุมัติ

## Controllers ที่ไม่ใช้แล้ว

### `src/controllers/AddDormitoryController.js`
- **เหตุผล**: ระบบใหม่ไม่มีการให้ owner เพิ่มหอพักเอง
- **แทนที่ด้วย**: `submissionController.js` (สำหรับฟอร์มคนทั่วไป)

### `src/controllers/deleteDormitoryController.js`
- **เหตุผล**: ระบบใหม่ไม่มีการให้ owner ลบหอพักเอง
- **แทนที่ด้วย**: ฟังก์ชันลบใน `adminController.js`

### `src/controllers/editDormitoryController.js`
- **เหตุผล**: ระบบใหม่ไม่มีการให้ owner แก้ไขหอพักเอง
- **แทนที่ด้วย**: ฟังก์ชันแก้ไขใน `adminController.js`

### `src/controllers/profileController.js`
- **เหตุผล**: ระบบใหม่ไม่มี member และ owner profiles
- **แทนที่ด้วย**: ฟังก์ชัน admin profile ใน `authController.js`

### `src/controllers/reviewController.js`
- **เหตุผล**: ระบบใหม่ยังไม่มีระบบรีวิว
- **สถานะ**: อาจเพิ่มในอนาคต

## Services ที่ไม่ใช้แล้ว

### `src/services/r2StorageService.js`
- **เหตุผล**: เปลี่ยนไปใช้ Supabase Storage
- **แทนที่ด้วย**: `supabaseStorageService.js`

### `src/services/mlService.js`
- **เหตุผล**: ระบบใหม่ไม่มี ML features
- **สถานะ**: อาจเพิ่มในอนาคตสำหรับ recommendation หรือ duplicate detection

### `src/services/userService.js` (บางส่วน)
- **เหตุผล**: ระบบใหม่ไม่มี member/owner registration
- **ที่เหลือ**: เฉพาะฟังก์ชัน admin-related

## Controllers ที่ปรับปรุงแล้ว

### `src/controllers/authController.js`
- **เปลี่ยนแปลง**: เหลือเฉพาะ admin login
- **ลบออก**: member/owner registration และ login

### `src/controllers/dormitoryController.js`
- **สถานะ**: ยังใช้ได้ (สำหรับ public API)
- **การใช้งาน**: ดึงข้อมูลหอพักที่อนุมัติแล้ว

### `src/controllers/adminDormitoryController.js`
- **สถานะ**: ยังใช้ได้
- **การใช้งาน**: จัดการข้อมูลหอพักโดยแอดมิน

## ไฟล์ใหม่ที่ต้องสร้าง

### `src/controllers/submissionController.js`
- **วัตถุประสงค์**: จัดการฟอร์มส่งข้อมูลจากคนทั่วไป
- **ฟังก์ชัน**: รับข้อมูล, validation, บันทึกลง raw_submissions

### `src/controllers/adminController.js`
- **วัตถุประสงค์**: จัดการข้อมูลโดยแอดมิน
- **ฟังก์ชัน**: อนุมัติ/ปฏิเสธ, แก้ไข, ลบ, dashboard

## Database ใหม่

### ตารางใหม่
- `admins` - ข้อมูลแอดมิน
- `raw_submissions` - ข้อมูลดิบจากฟอร์ม
- `approved_dormitories` - ข้อมูลที่อนุมัติแล้ว
- `dormitory_images` - รูปภาพหอพัก
- `dormitory_amenities` - สิ่งอำนวยความสะดวก
- `zones` - โซนพื้นที่

### ตารางเก่าที่ไม่ใช้แล้ว
- `users` - ไม่มี member/owner แล้ว
- `member_requests` - ไม่มีระบบสมาชิก
- `stay_history` - ไม่มีระบบสมาชิก
- `room_types` - ใช้ข้อมูลราคาแบบง่าย

## Environment Variables ที่ไม่ใช้แล้ว

```env
# ไม่ใช้แล้ว - Cloudflare R2
# R2_ENDPOINT=...
# R2_ACCESS_KEY_ID=...
# R2_SECRET_ACCESS_KEY=...
# R2_BUCKET_NAME=...
# R2_PUBLIC_DOMAIN=...

# ไม่ใช้แล้ว - ML API
# ML_API_URL=...

# ไม่ใช้แล้ว - Firebase Storage
# FIREBASE_STORAGE_BUCKET=...
```

## Routes ที่ต้องปรับปรุง

### ลบออก
- `/api/auth/google-login` (member/owner)
- `/api/auth/register`
- `/api/auth/profile`
- `/api/dormitories/add`
- `/api/dormitories/edit`
- `/api/dormitories/delete`
- `/api/profile/*`
- `/api/reviews/*`

### เพิ่มใหม่
- `/api/submissions` - ฟอร์มส่งข้อมูล
- `/api/admin/login` - admin login
- `/api/admin/dashboard` - admin dashboard
- `/api/admin/submissions` - จัดการข้อมูลรอตรวจสอบ

### ยังใช้ได้
- `/api/dormitories` - ข้อมูลหอพักสาธารณะ
- `/api/admin/dormitories` - จัดการหอพักโดยแอดมิน