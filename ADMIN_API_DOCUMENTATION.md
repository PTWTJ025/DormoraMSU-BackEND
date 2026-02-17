# Admin API Documentation

## Base URL
```
http://localhost:3000/api/admin
```

## Authentication
All admin endpoints require Firebase authentication token in the Authorization header:
```
Authorization: Bearer <firebase_token>
```

---

## 1. Get All Dormitories (รายการหอทั้งหมด)

### Endpoint
```
GET /api/admin/submissions
GET /api/admin/dormitories/all
```

### Description
ดึงรายการหอพักทั้งหมดในระบบ (ทุกสถานะ: pending, approved, rejected)

### Request Headers
```
Authorization: Bearer <firebase_token>
```

### Response (200 OK)
```json
[
  {
    "dorm_id": 1,
    "dorm_name": "หอพักดอกไม้",
    "address": "123 ถนนสุขุมวิท",
    "approval_status": "pending",
    "submitted_date": "2024-01-15T10:30:00.000Z",
    "monthly_price": 3500,
    "daily_price": 150,
    "room_type": "ห้องพัดลม",
    "zone_name": "ใกล้มหาวิทยาลัย",
    "main_image_url": "https://storage.url/image1.jpg"
  }
]
```

### Response Fields
- `dorm_id`: ID หอพัก
- `dorm_name`: ชื่อหอพัก
- `address`: ที่อยู่
- `approval_status`: สถานะ ("pending", "approved", "rejected")
- `submitted_date`: วันที่ส่งข้อมูล
- `monthly_price`: ค่าเช่ารายเดือน (บาท)
- `daily_price`: ค่าเช่ารายวัน (บาท)
- `room_type`: ประเภทห้อง
- `zone_name`: ชื่อโซน
- `main_image_url`: รูปภาพหลัก

---

## 2. Get Pending Dormitories (รายการหอที่รออนุมัติ)

### Endpoint
```
GET /api/admin/submissions/pending
GET /api/admin/dormitories/pending
```

### Description
ดึงรายการหอพักที่มีสถานะ "pending" (รออนุมัติ) เท่านั้น

### Request Headers
```
Authorization: Bearer <firebase_token>
```

### Response (200 OK)
```json
[
  {
    "dorm_id": 1,
    "dorm_name": "หอพักดอกไม้",
    "address": "123 ถนนสุขุมวิท",
    "approval_status": "pending",
    "submitted_date": "2024-01-15T10:30:00.000Z",
    "monthly_price": 3500,
    "daily_price": 150,
    "room_type": "ห้องพัดลม",
    "zone_name": "ใกล้มหาวิทยาลัย",
    "main_image_url": "https://storage.url/image1.jpg"
  }
]
```

---

## 3. Get Dormitory Details (รายละเอียดหอพัก)

### Endpoint
```
GET /api/admin/submissions/:dormId
GET /api/admin/dormitories/:dormId
```

### Description
ดึงรายละเอียดหอพักแบบเต็ม รวมรูปภาพและสิ่งอำนวยความสะดวก

### Request Headers
```
Authorization: Bearer <firebase_token>
```

### URL Parameters
- `dormId` (required): ID ของหอพัก

### Response (200 OK)
```json
{
  "dorm_id": 1,
  "dorm_name": "หอพักดอกไม้",
  "address": "123 ถนนสุขุมวิท กรุงเทพฯ 10110",
  "dorm_description": "หอพักสะอาด ปลอดภัย ใกล้มหาวิทยาลัย",
  "latitude": 13.7563,
  "longitude": 100.5018,
  "zone_id": 1,
  "zone_name": "ใกล้มหาวิทยาลัย",
  "monthly_price": 3500,
  "daily_price": 150,
  "summer_price": 4000,
  "deposit": 3500,
  "room_type": "ห้องพัดลม",
  "electricity_price": 8,
  "water_price_type": "per_unit",
  "water_price": 25,
  "approval_status": "pending",
  "submitted_date": "2024-01-15T10:30:00.000Z",
  "updated_date": "2024-01-15T10:30:00.000Z",
  "images": [
    {
      "image_id": 1,
      "image_url": "https://storage.url/image1.jpg",
      "is_primary": true
    },
    {
      "image_id": 2,
      "image_url": "https://storage.url/image2.jpg",
      "is_primary": false
    }
  ],
  "amenities": [
    {
      "amenity_id": 1,
      "amenity_name": "แอร์"
    },
    {
      "amenity_id": 2,
      "amenity_name": "WIFI"
    },
    {
      "amenity_id": 3,
      "amenity_name": "เครื่องทำน้ำอุ่น"
    }
  ]
}
```

### Response Fields Explanation
- `electricity_price`: ค่าไฟ (บาท/หน่วย)
- `water_price_type`: ประเภทค่าน้ำ ("per_unit" = ต่อหน่วย, "flat_rate" = รายเดือน)
- `water_price`: ค่าน้ำ (บาท)
- `summer_price`: ค่าเทอมซัมเมอร์ (บาท/เดือน)
- `deposit`: ค่าประกันห้อง (บาท)
- `approval_status`: สถานะการอนุมัติ ("pending", "approved", "rejected")
- `images`: รูปภาพทั้งหมด (is_primary = true คือรูปหลัก)
- `amenities`: สิ่งอำนวยความสะดวก (array ของ amenity objects)

---

## 4. Approve/Reject Dormitory (อนุมัติ/ปฏิเสธหอพัก)

### Endpoint
```
PUT /api/admin/dormitories/:dormId/approval
```

### Description
อนุมัติหรือปฏิเสธหอพัก

### Request Headers
```
Authorization: Bearer <firebase_token>
Content-Type: application/json
```

### URL Parameters
- `dormId` (required): ID ของหอพัก

### Request Body
```json
{
  "status": "approved"
}
```

### Status Values
- `"approved"` - อนุมัติหอพัก
- `"rejected"` - ปฏิเสธหอพัก

### Response (200 OK)
```json
{
  "message": "สถานะการอนุมัติหอพักถูกปรับปรุงเรียบร้อยแล้ว"
}
```

---

## 5. Edit Dormitory (แก้ไขหอพัก)

### Endpoint
```
PUT /api/admin/dormitories/:dormId
```

### Description
แก้ไขข้อมูลหอพักโดยแอดมิน (ส่งเฉพาะฟิลด์ที่ต้องการแก้ไข)

### Request Headers
```
Authorization: Bearer <firebase_token>
Content-Type: application/json
```

### URL Parameters
- `dormId` (required): ID ของหอพัก

### Request Body (ส่งเฉพาะฟิลด์ที่ต้องการแก้ไข)
```json
{
  "dorm_name": "หอพักดอกไม้ (แก้ไข)",
  "address": "123 ถนนสุขุมวิท กรุงเทพฯ 10110",
  "dorm_description": "หอพักสะอาด ปลอดภัย ใกล้มหาวิทยาลัย",
  "latitude": 13.7563,
  "longitude": 100.5018,
  "zone_id": 1,
  "monthly_price": 3500,
  "daily_price": 150,
  "summer_price": 4000,
  "deposit": 3500,
  "room_type": "ห้องพัดลม",
  "electricity_price": 8,
  "water_price_type": "per_unit",
  "water_price": 25
}
```

### Allowed Fields
- `dorm_name`: ชื่อหอพัก
- `address`: ที่อยู่
- `dorm_description`: คำอธิบาย
- `latitude`: ละติจูด (number)
- `longitude`: ลองจิจูด (number)
- `zone_id`: ID โซน (number)
- `monthly_price`: ค่าเช่ารายเดือน (บาท)
- `daily_price`: ค่าเช่ารายวัน (บาท)
- `summer_price`: ค่าเทอมซัมเมอร์ (บาท/เดือน)
- `deposit`: ค่าประกันห้อง (บาท)
- `room_type`: ประเภทห้อง
- `electricity_price`: ค่าไฟ (บาท/หน่วย)
- `water_price_type`: ประเภทค่าน้ำ ("per_unit" หรือ "flat_rate")
- `water_price`: ค่าน้ำ (บาท)

### Response (200 OK)
```json
{
  "message": "อัปเดตข้อมูลหอพักเรียบร้อยแล้ว"
}
```

---

## 6. Delete Dormitory (ลบหอพัก)

### Endpoint
```
DELETE /api/admin/dormitories/:dormId
```

### Description
ลบหอพักออกจากระบบ (ลบถาวร ไม่มีการเช็คเงื่อนไข)

### Request Headers
```
Authorization: Bearer <firebase_token>
```

### URL Parameters
- `dormId` (required): ID ของหอพัก

### Response (200 OK)
```json
{
  "message": "ลบหอพัก \"หอพักดอกไม้\" เรียบร้อยแล้ว",
  "dorm_name": "หอพักดอกไม้"
}
```

### Note
- การลบจะลบข้อมูลทั้งหมดที่เกี่ยวข้อง: amenity mapping, images, และข้อมูลหอพัก
- ไม่มีการเช็คเงื่อนไขใดๆ ก่อนลบ
- ลบแล้วไม่สามารถกู้คืนได้

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "ไม่มีข้อมูลที่ต้องอัปเดต"
}
```

### 401 Unauthorized
```json
{
  "message": "ไม่พบ token การยืนยันตัวตน"
}
```

### 403 Forbidden
```json
{
  "message": "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถดำเนินการนี้ได้"
}
```

### 404 Not Found
```json
{
  "message": "ไม่พบข้อมูลหอพัก"
}
```

### 500 Internal Server Error
```json
{
  "message": "เกิดข้อผิดพลาดในการดำเนินการ"
}
```

---

## Important Notes

1. **Compare Feature**: ไม่มี endpoint สำหรับเปรียบเทียบหอพัก (ถ้าต้องการต้องสร้างใหม่)
2. **Approval Status**: ใช้ค่า `"pending"`, `"approved"`, `"rejected"` (ภาษาอังกฤษ)
3. **Delete**: การลบหอพักเป็นการลบถาวร ไม่มีการเช็คเงื่อนไขใดๆ
4. **Authentication**: ทุก endpoint ต้องมี Firebase token และต้องเป็น admin ที่ active
5. **Edit**: ส่งเฉพาะฟิลด์ที่ต้องการแก้ไข ไม่จำเป็นต้องส่งทุกฟิลด์
6. **Images & Amenities**: การแก้ไขรูปภาพและสิ่งอำนวยความสะดวกต้องทำผ่าน endpoint อื่น (ยังไม่มี)

---

## Summary Table

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/api/admin/submissions` | GET | รายการหอทั้งหมด | ✅ Working |
| `/api/admin/submissions/pending` | GET | รายการหอที่รออนุมัติ | ✅ Working |
| `/api/admin/submissions/:dormId` | GET | รายละเอียดหอพัก | ✅ Working |
| `/api/admin/dormitories/:dormId/approval` | PUT | อนุมัติ/ปฏิเสธหอพัก | ✅ Working |
| `/api/admin/dormitories/:dormId` | PUT | แก้ไขหอพัก | ✅ Working |
| `/api/admin/dormitories/:dormId` | DELETE | ลบหอพัก | ✅ Working |
| Compare Feature | - | เปรียบเทียบหอพัก | ❌ Not Implemented |


---

## 7. GET /compare (Compare Multiple Dormitories) - สำหรับคนทั่วไป

**Endpoint:** `GET /api/dormitories/compare`

**Description:** เปรียบเทียบหอพักหลายตัวพร้อมกัน (สำหรับหน้า Compare - ไม่ต้อง login)

**Request:**
- Method: GET
- Headers: ไม่ต้องมี Authorization
- Query params: `dormIds` (string, comma-separated) - เช่น `?dormIds=1,2,3`
- Body: None

**Example Request:**
```
GET /api/dormitories/compare?dormIds=20,21,22
```

**Response:** `200 OK`
```json
[
  {
    "dorm_id": 20,
    "dorm_name": "หอพักตัวอย่าง 1",
    "address": "123 ถนนตัวอย่าง",
    "dorm_description": "หอพักสะอาด ใกล้มหาวิทยาลัย",
    "latitude": 13.7563,
    "longitude": 100.5018,
    "zone_id": 1,
    "zone_name": "ใกล้มหาวิทยาลัย",
    "monthly_price": 3500,
    "daily_price": 150,
    "summer_price": 3000,
    "deposit": 3500,
    "room_type": "ห้องพัดลม",
    "room_type_other": null,
    "electricity_price": 8,
    "water_price_type": "per_unit",
    "water_price": 25,
    "contact_name": "คุณสมชาย",
    "contact_phone": "0812345678",
    "contact_email": "somchai@example.com",
    "line_id": "somchai123",
    "main_image_url": "https://storage.url/image1.jpg",
    "amenities": [
      {
        "amenity_id": 1,
        "amenity_name": "แอร์"
      },
      {
        "amenity_id": 2,
        "amenity_name": "WIFI"
      }
    ]
  },
  {
    "dorm_id": 21,
    "dorm_name": "หอพักตัวอย่าง 2",
    "address": "456 ถนนตัวอย่าง",
    "dorm_description": "หอพักใหม่ สะดวกสบาย",
    "latitude": 13.7600,
    "longitude": 100.5100,
    "zone_id": 2,
    "zone_name": "ใกล้ตลาด",
    "monthly_price": 4000,
    "daily_price": 180,
    "summer_price": 3500,
    "deposit": 4000,
    "room_type": "ห้องแอร์",
    "room_type_other": null,
    "electricity_price": 7,
    "water_price_type": "flat_rate",
    "water_price": 150,
    "contact_name": "คุณสมหญิง",
    "contact_phone": "0823456789",
    "contact_email": "somying@example.com",
    "line_id": "somying456",
    "main_image_url": "https://storage.url/image2.jpg",
    "amenities": [
      {
        "amenity_id": 1,
        "amenity_name": "แอร์"
      },
      {
        "amenity_id": 3,
        "amenity_name": "ที่จอดรถ"
      }
    ]
  }
]
```

**Field Types:**
- `dorm_id`: integer
- `dorm_name`: string
- `address`: string
- `dorm_description`: string (nullable)
- `latitude`: number (nullable)
- `longitude`: number (nullable)
- `zone_id`: integer (nullable)
- `zone_name`: string (nullable)
- `monthly_price`: decimal
- `daily_price`: decimal (nullable)
- `summer_price`: decimal (nullable)
- `deposit`: decimal (nullable)
- `room_type`: string
- `room_type_other`: string (nullable)
- `electricity_price`: decimal (nullable)
- `water_price_type`: string (nullable)
- `water_price`: decimal (nullable)
- `contact_name`: string (nullable)
- `contact_phone`: string (nullable)
- `contact_email`: string (nullable)
- `line_id`: string (nullable)
- `main_image_url`: string (nullable)
- `amenities`: array of objects `[{amenity_id, amenity_name}]`

**Error Responses:**
- `400`: Missing dormIds or invalid format
- `404`: No approved dormitories found with specified IDs

**Notes:**
- ไม่ต้อง login ใช้งานได้เลย (Public API)
- แสดงเฉพาะหอที่ approval_status = 'approved'
- สามารถส่ง dormIds กี่ตัวก็ได้ (แนะนำไม่เกิน 5 ตัวเพื่อประสิทธิภาพ)
- ถ้า dormId ใดไม่มีในระบบหรือยังไม่ approved จะไม่ส่งกลับมา (ไม่ error)
- ข้อมูลจะเรียงตาม dorm_id จากน้อยไปมาก
- ใช้สำหรับหน้า Compare ที่ต้องการแสดงข้อมูลหลายหอเคียงกัน

