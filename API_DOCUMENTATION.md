# API Documentation - Dormitory Submission System

## ภาพรวม
ระบบรับข้อมูลหอพักจากฟอร์มหน้าบ้าน และระบบจัดการสำหรับแอดมิน

---

## Phase 1: Public Form Submission API

### POST /api/submissions
ส่งข้อมูลหอพักจากฟอร์มหน้าบ้าน (ไม่ต้อง login)

**Request Type:** `multipart/form-data`

**Request Body:**
```javascript
FormData {
  // Step 1: Basic Info (Required)
  dorm_name: string (min 3 chars)
  address: string (min 10 chars)
  zone_name: string
  
  // Step 2: Contact Info (Optional)
  contact_name?: string
  contact_phone?: string (9-10 digits)
  contact_email?: string (email format)
  line_id?: string
  
  // Step 3: Room Type & Pricing (Required)
  room_type: string ("ห้องแอร์" | "ห้องคู่" | "ห้องพัดลม" | "อื่นๆ")
  room_type_other?: string (required if room_type = "อื่นๆ")
  monthly_price?: number (at least one of monthly or daily required)
  daily_price?: number (at least one of monthly or daily required)
  summer_price?: number
  deposit?: number
  
  // Step 4: Images & Additional (Required)
  images: File[] (3-20 files, max 5MB each)
  primary_image_index: number (0-based index)
  latitude: number
  longitude: number
  amenities?: string (JSON array)
  description?: string
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "ส่งข้อมูลหอพักเรียบร้อยแล้ว รอการตรวจสอบจากทีมงาน",
  "submission_id": 123
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง",
  "errors": {
    "dorm_name": "ชื่อหอพักต้องมีอย่างน้อย 3 ตัวอักษร",
    "images": "กรุณาอัปโหลดรูปภาพอย่างน้อย 3 รูป"
  }
}
```

**Example (JavaScript):**
```javascript
const formData = new FormData();

// Basic Info
formData.append('dorm_name', 'อันดา เพลส');
formData.append('address', 'ขามเรียง ซอยเซเว่น 1');
formData.append('zone_name', 'ขามเรียง');

// Contact Info
formData.append('contact_phone', '0812345678');

// Room Type & Pricing
formData.append('room_type', 'ห้องแอร์');
formData.append('monthly_price', '3500');

// Images
images.forEach(img => formData.append('images', img.file));
formData.append('primary_image_index', '0');

// Location
formData.append('latitude', '16.2467');
formData.append('longitude', '103.2565');

// Amenities
formData.append('amenities', JSON.stringify(['WIFI', 'แอร์']));

const response = await fetch('/api/submissions', {
  method: 'POST',
  body: formData
});
```

---

## Phase 2: Admin Management API

### 🔒 Authentication Required
ทุก API ใน Phase 2 ต้องมี Firebase Token ใน Header:
```
Authorization: Bearer <firebase_token>
```

---

### GET /api/submissions
ดึงรายการ submissions ทั้งหมด (สำหรับแอดมิน)

**Query Parameters:**
- `status` (optional): "pending" | "approved" | "rejected"

**Response (200):**
```json
[
  {
    "submission_id": 1,
    "dorm_name": "อันดา เพลส",
    "address": "ขามเรียง ซอยเซเว่น 1",
    "zone_name": "ขามเรียง",
    "room_type": "ห้องแอร์",
    "monthly_price": 3500,
    "status": "pending",
    "submitted_date": "2026-02-15T10:00:00Z",
    "image_count": 5,
    "amenity_count": 8,
    "primary_image": "https://...",
    "processed_by_username": null
  }
]
```

**Example:**
```javascript
// ดึงเฉพาะที่ pending
GET /api/submissions?status=pending

// ดึงทั้งหมด
GET /api/submissions
```

---

### GET /api/submissions/:submissionId
ดึงข้อมูล submission ตาม ID (พร้อมรูปภาพและสิ่งอำนวยความสะดวก)

**Response (200):**
```json
{
  "submission_id": 1,
  "dorm_name": "อันดา เพลส",
  "address": "ขามเรียง ซอยเซเว่น 1",
  "zone_name": "ขามเรียง",
  "contact_name": "คุณสมชาย",
  "contact_phone": "0812345678",
  "room_type": "ห้องแอร์",
  "monthly_price": 3500,
  "daily_price": 150,
  "latitude": 16.2467,
  "longitude": 103.2565,
  "description": "หอพักใหม่ สะอาด",
  "status": "pending",
  "submitted_date": "2026-02-15T10:00:00Z",
  "images": [
    {
      "image_id": 1,
      "image_url": "https://...",
      "is_primary": true,
      "display_order": 0
    }
  ],
  "amenities": ["WIFI", "แอร์", "ที่จอดรถ"]
}
```

---

### PUT /api/submissions/:submissionId
แก้ไข submission (ก่อนอนุมัติ)

**Request Body (JSON):**
```json
{
  "dorm_name": "อันดา เพลส (แก้ไข)",
  "address": "ที่อยู่ใหม่",
  "zone_name": "กู่แก้ว",
  "monthly_price": 4000
}
```

**Note:** ส่งเฉพาะฟิลด์ที่ต้องการแก้ไข

**Response (200):**
```json
{
  "success": true,
  "message": "แก้ไขข้อมูลเรียบร้อยแล้ว",
  "submission": { ... }
}
```

---

### POST /api/submissions/:submissionId/approve
อนุมัติ submission (ย้ายไป approved_dormitories)

**Response (200):**
```json
{
  "success": true,
  "message": "อนุมัติข้อมูลหอพักเรียบร้อยแล้ว",
  "dorm_id": 5
}
```

**การทำงาน:**
1. ดึงข้อมูลจาก `raw_submissions`
2. สร้างข้อมูลใหม่ใน `approved_dormitories`
3. คัดลอกรูปภาพไป `dormitory_images`
4. คัดลอกสิ่งอำนวยความสะดวกไป `dormitory_amenities`
5. อัพเดทสถานะ submission เป็น "approved"

---

### POST /api/submissions/:submissionId/reject
ปฏิเสธ submission

**Request Body (JSON):**
```json
{
  "rejection_reason": "ข้อมูลไม่ครบถ้วน"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "ปฏิเสธข้อมูลหอพักเรียบร้อยแล้ว",
  "submission": { ... }
}
```

---

### DELETE /api/submissions/:submissionId
ลบ submission

**Response (200):**
```json
{
  "success": true,
  "message": "ลบข้อมูลเรียบร้อยแล้ว"
}
```

**Note:** CASCADE จะลบรูปภาพและสิ่งอำนวยความสะดวกอัตโนมัติ

---

## Database Schema

### raw_submissions
```sql
submission_id SERIAL PRIMARY KEY
dorm_name VARCHAR(255) NOT NULL
address TEXT
zone_name VARCHAR(100)
contact_name VARCHAR(255)
contact_phone VARCHAR(20)
contact_email VARCHAR(255)
line_id VARCHAR(100)
room_type VARCHAR(100)
room_type_other VARCHAR(100)
monthly_price DECIMAL(10, 2)
daily_price DECIMAL(10, 2)
summer_price DECIMAL(10, 2)
deposit DECIMAL(10, 2)
latitude DECIMAL(10, 8)
longitude DECIMAL(11, 8)
description TEXT
status VARCHAR(50) DEFAULT 'pending'
processed_by INTEGER REFERENCES admins(admin_id)
processed_date TIMESTAMP
admin_notes TEXT
rejection_reason TEXT
submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### submission_images
```sql
image_id SERIAL PRIMARY KEY
submission_id INTEGER REFERENCES raw_submissions(submission_id) ON DELETE CASCADE
image_url TEXT NOT NULL
is_primary BOOLEAN DEFAULT FALSE
display_order INTEGER
uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### submission_amenities
```sql
submission_id INTEGER REFERENCES raw_submissions(submission_id) ON DELETE CASCADE
amenity_name VARCHAR(100) NOT NULL
PRIMARY KEY (submission_id, amenity_name)
```

---

## Validation Rules

### Required Fields:
1. `dorm_name` (min 3 chars)
2. `address` (min 10 chars)
3. `zone_name`
4. `room_type`
5. `room_type_other` (if room_type = "อื่นๆ")
6. At least one: `monthly_price` OR `daily_price`
7. `images` (3-20 files)
8. `primary_image_index`
9. `latitude`
10. `longitude`

### Optional Fields:
- All contact info
- `summer_price`, `deposit`
- `amenities`, `description`

### File Upload:
- Image types only (image/*)
- Max 5MB per file
- Min 3 images, Max 20 images

---

## Status Flow

```
pending → approved → แสดงในหน้าบ้าน
        ↘ rejected → ไม่แสดง
```

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/submissions` | ❌ | ส่งข้อมูลจากฟอร์ม |
| GET | `/api/submissions` | ✅ | ดึงรายการทั้งหมด |
| GET | `/api/submissions/:id` | ✅ | ดึงข้อมูลตาม ID |
| PUT | `/api/submissions/:id` | ✅ | แก้ไขข้อมูล |
| POST | `/api/submissions/:id/approve` | ✅ | อนุมัติ |
| POST | `/api/submissions/:id/reject` | ✅ | ปฏิเสธ |
| DELETE | `/api/submissions/:id` | ✅ | ลบ |

---

## Testing

### Test Form Submission:
```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "dorm_name=Test Dorm" \
  -F "address=123 Test Street" \
  -F "zone_name=กู่แก้ว" \
  -F "room_type=ห้องแอร์" \
  -F "monthly_price=3500" \
  -F "latitude=16.2467" \
  -F "longitude=103.2565" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg" \
  -F "primary_image_index=0"
```

### Test Get Submissions (Admin):
```bash
curl http://localhost:3000/api/submissions?status=pending \
  -H "Authorization: Bearer <firebase_token>"
```

### Test Approve:
```bash
curl -X POST http://localhost:3000/api/submissions/1/approve \
  -H "Authorization: Bearer <firebase_token>"
```

---

## Error Handling

### Common Errors:
- 400: Validation error
- 401: Unauthorized (no token)
- 404: Submission not found
- 500: Server error

### Error Response Format:
```json
{
  "success": false,
  "message": "Error message",
  "errors": { ... }
}
```
