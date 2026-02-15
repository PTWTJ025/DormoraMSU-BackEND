# สรุปความต้องการฟอร์มส่งข้อมูลหอพักจากหน้าบ้าน

## ภาพรวม
ฟอร์มแบ่งเป็น 4 ขั้นตอน ผู้ใช้ไม่ต้อง login สามารถกรอกข้อมูลและส่งได้เลย

---

## ขั้นตอนที่ 1: ข้อมูลหอพัก (Basic Information)

### ฟิลด์ที่ต้องกรอก (Required):
1. **ชื่อหอพัก** (`dorm_name`)
   - ประเภท: ข้อความ
   - ความยาวขั้นต่ำ: 3 ตัวอักษร
   - ตัวอย่าง: "อันดา เพลส", "ABC Dormitory"

2. **ที่อยู่หอพัก** (`address`)
   - ประเภท: ข้อความ
   - ความยาวขั้นต่ำ: 10 ตัวอักษร
   - ตัวอย่าง: "123 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240"

3. **โซน/พื้นที่** (`zone_name`)
   - ประเภท: เลือกจาก dropdown
   - ดึงข้อมูลจาก: `GET /api/zones`
   - ตัวอย่าง: "กู่แก้ว", "ขามเรียง", "ดอนนา", "ท่าขอนยาง", "หน้ามอ"

---

## ขั้นตอนที่ 2: ข้อมูลติดต่อ (Contact Information)

### ฟิลด์ทั้งหมดเป็น Optional (ไม่บังคับ):

1. **ชื่อผู้ติดต่อ** (`contact_name`)
   - ประเภท: ข้อความ
   - ตัวอย่าง: "คุณสมชาย ใจดี"

2. **เบอร์โทรศัพท์** (`contact_phone`)
   - ประเภท: ตัวเลข
   - รูปแบบ: 9-10 หลัก
   - ตัวอย่าง: "0812345678", "081-234-5678"

3. **อีเมล** (`contact_email`)
   - ประเภท: อีเมล
   - รูปแบบ: ต้องเป็นอีเมลที่ถูกต้อง
   - ตัวอย่าง: "contact@example.com"

4. **Line ID** (`line_id`)
   - ประเภท: ข้อความ
   - ตัวอย่าง: "@dormname", "somchai123"

---

## ขั้นตอนที่ 3: ประเภทห้องและราคา (Room Type & Pricing)

### ฟิลด์ที่ต้องกรอก (Required):

1. **ประเภทห้อง** (`room_type`)
   - ประเภท: เลือก 1 จาก 4 ตัวเลือก
   - ตัวเลือก:
     - "ห้องแอร์"
     - "ห้องคู่"
     - "ห้องพัดลม"
     - "อื่นๆ"
   
2. **ระบุประเภทห้องอื่นๆ** (`room_type_other`)
   - ประเภท: ข้อความ
   - เงื่อนไข: **บังคับกรอกถ้าเลือก "อื่นๆ"**
   - ตัวอย่าง: "ห้องสตูดิโอ", "ห้องเดี่ยว"

3. **ราคา** - ต้องกรอกอย่างน้อย 1 รายการ
   - **ราคาต่อเดือน** (`monthly_price`)
     - ประเภท: ตัวเลข (บาท)
     - ตัวอย่าง: 3500
   
   - **ราคาต่อวัน** (`daily_price`)
     - ประเภท: ตัวเลข (บาท)
     - ตัวอย่าง: 150
   
   - **ราคาซัมเมอร์** (`summer_price`) - Optional
     - ประเภท: ตัวเลข (บาท)
     - ตัวอย่าง: 9000
   
   - **ค่าประกันห้อง** (`deposit`) - Optional
     - ประเภท: ตัวเลข (บาท)
     - ตัวอย่าง: 3500

**เงื่อนไข:** ต้องกรอก `monthly_price` หรือ `daily_price` อย่างน้อย 1 รายการ

---

## ขั้นตอนที่ 4: รูปภาพและข้อมูลเพิ่มเติม (Images & Additional Info)

### ฟิลด์ที่ต้องกรอก (Required):

1. **รูปภาพหอพัก** (`images`)
   - ประเภท: ไฟล์รูปภาพ (array)
   - จำนวนขั้นต่ำ: **3 รูป**
   - จำนวนสูงสุด: **20 รูป**
   - ประเภทไฟล์: image/* (jpg, png, etc.)
   - ขนาดไฟล์สูงสุด: **5MB ต่อรูป**

2. **รูปหลัก** (`primary_image_index`)
   - ประเภท: ตัวเลข (index)
   - เงื่อนไข: ต้องระบุว่ารูปไหนเป็นรูปหลัก
   - ตัวอย่าง: 0 (รูปแรก), 1 (รูปที่สอง)

3. **พิกัดหอพัก** (Location)
   - **ละติจูด** (`latitude`)
     - ประเภท: ตัวเลขทศนิยม
     - ตัวอย่าง: 16.2467
   
   - **ลองจิจูด** (`longitude`)
     - ประเภท: ตัวเลขทศนิยม
     - ตัวอย่าง: 103.2565
   
   - วิธีการกรอก: คลิกบนแผนที่หรือลากหมุด

### ฟิลด์ที่ไม่บังคับ (Optional):

4. **สิ่งอำนวยความสะดวก** (`amenities`)
   - ประเภท: เลือกได้หลายรายการ (array)
   - ดึงข้อมูลจาก: `GET /api/dormitories/amenities`
   - ตัวอย่าง: ["WIFI", "กล้องวงจรปิด", "เครื่องซักผ้า", "ที่จอดรถ"]

5. **คำอธิบายเพิ่มเติม** (`description`)
   - ประเภท: ข้อความ (textarea)
   - ตัวอย่าง: "หอพักใหม่ สะอาด ปลอดภัย มีรปภ. 24 ชม."

---

## สรุปฟิลด์ทั้งหมด

### ฟิลด์บังคับ (Required) - 10 ฟิลด์:
1. ✅ `dorm_name` - ชื่อหอพัก (min 3 chars)
2. ✅ `address` - ที่อยู่ (min 10 chars)
3. ✅ `zone_name` - โซน
4. ✅ `room_type` - ประเภทห้อง
5. ✅ `room_type_other` - ระบุประเภทอื่นๆ (ถ้าเลือก "อื่นๆ")
6. ✅ `monthly_price` หรือ `daily_price` - ราคา (อย่างน้อย 1 รายการ)
7. ✅ `images` - รูปภาพ (min 3, max 20)
8. ✅ `primary_image_index` - รูปหลัก
9. ✅ `latitude` - ละติจูด
10. ✅ `longitude` - ลองจิจูด

### ฟิลด์ไม่บังคับ (Optional) - 7 ฟิลด์:
1. ⭕ `contact_name` - ชื่อผู้ติดต่อ
2. ⭕ `contact_phone` - เบอร์โทร (9-10 หลัก)
3. ⭕ `contact_email` - อีเมล
4. ⭕ `line_id` - Line ID
5. ⭕ `summer_price` - ราคาซัมเมอร์
6. ⭕ `deposit` - ค่าประกัน
7. ⭕ `amenities` - สิ่งอำนวยความสะดวก
8. ⭕ `description` - คำอธิบาย

---

## กฎการตรวจสอบ (Validation Rules)

### ข้อความ (Text):
- `dorm_name`: ขั้นต่ำ 3 ตัวอักษร
- `address`: ขั้นต่ำ 10 ตัวอักษร

### ตัวเลข (Numbers):
- `contact_phone`: 9-10 หลัก (ถ้ากรอก)
- ราคาทั้งหมด: ต้องเป็นตัวเลขบวก

### อีเมล:
- `contact_email`: รูปแบบอีเมลที่ถูกต้อง (ถ้ากรอก)

### รูปภาพ:
- จำนวน: 3-20 รูป
- ขนาด: สูงสุด 5MB ต่อรูป
- ประเภท: image/* เท่านั้น
- ต้องระบุรูปหลัก

### ราคา:
- ต้องกรอก `monthly_price` หรือ `daily_price` อย่างน้อย 1 รายการ

### พิกัด:
- ต้องกรอกทั้ง `latitude` และ `longitude`

---

## API ที่ต้องใช้

### 1. GET /api/zones
ดึงรายการโซนทั้งหมด (สำหรับ dropdown ในขั้นตอนที่ 1)

**Response:**
```json
[
  {"zone_id": 1, "zone_name": "ท่าขอนยาง"},
  {"zone_id": 2, "zone_name": "ขามเรียง"},
  {"zone_id": 3, "zone_name": "หน้ามอ"},
  {"zone_id": 4, "zone_name": "กู่แก้ว"},
  {"zone_id": 5, "zone_name": "ดอนนา"}
]
```

### 2. GET /api/dormitories/amenities
ดึงรายการสิ่งอำนวยความสะดวกทั้งหมด (สำหรับ checkbox ในขั้นตอนที่ 4)

**Response:**
```json
[
  "Lobby", "TV", "WIFI", "กล้องวงจรปิด", "คีย์การ์ด",
  "เครื่องซักผ้า", "เครื่องทำน้ำอุ่น", "ซิงค์ล้างจาน",
  "ตู้เย็น", "ตู้เสื้อผ้า", "เตียงนอน", "โต๊ะเครื่องแป้ง",
  "โต๊ะทำงาน", "ที่จอดรถ", "ที่วางพัสดุ", "ผู้ดำหยอดเหรียญ",
  "พัดลม", "ฟิตเนส", "ไมโครเวฟ", "รปภ.", "ลิฟต์",
  "สระว่ายน้ำ", "อนุญาตให้เลี้ยงสัตว์", "แอร์"
]
```

### 3. POST /api/submissions
ส่งข้อมูลหอพักใหม่ (ต้องสร้าง)

**Request Type:** `multipart/form-data`

**Request Body:**
```javascript
FormData {
  // Step 1
  dorm_name: string
  address: string
  zone_name: string
  
  // Step 2 (optional)
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  line_id?: string
  
  // Step 3
  room_type: string
  room_type_other?: string
  monthly_price?: number
  daily_price?: number
  summer_price?: number
  deposit?: number
  
  // Step 4
  images: File[] (3-20 files)
  primary_image_index: number
  latitude: number
  longitude: number
  amenities?: string (JSON array)
  description?: string
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "ส่งข้อมูลหอพักเรียบร้อยแล้ว รอการตรวจสอบจากทีมงาน",
  "submission_id": 123
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "เกิดข้อผิดพลาดในการส่งข้อมูล",
  "errors": {
    "dorm_name": "ชื่อหอพักต้องมีอย่างน้อย 3 ตัวอักษร",
    "images": "ต้องอัปโหลดรูปภาพอย่างน้อย 3 รูป"
  }
}
```

---

## ตัวอย่างการส่งข้อมูล (JavaScript)

```javascript
const formData = new FormData();

// Step 1: Basic Info
formData.append('dorm_name', 'อันดา เพลส');
formData.append('address', 'ขามเรียง ซอยเซเว่น 1');
formData.append('zone_name', 'ขามเรียง');

// Step 2: Contact Info (optional)
formData.append('contact_name', 'คุณสมชาย');
formData.append('contact_phone', '0812345678');
formData.append('contact_email', 'contact@example.com');
formData.append('line_id', '@dormname');

// Step 3: Room Type & Pricing
formData.append('room_type', 'ห้องแอร์');
formData.append('monthly_price', '3500');
formData.append('daily_price', '150');
formData.append('summer_price', '9000');
formData.append('deposit', '3500');

// Step 4: Images (multiple files)
images.forEach((img) => {
  formData.append('images', img.file);
});
formData.append('primary_image_index', '0');

// Location
formData.append('latitude', '16.2467');
formData.append('longitude', '103.2565');

// Amenities (JSON string)
formData.append('amenities', JSON.stringify([
  'WIFI', 'กล้องวงจรปิด', 'เครื่องซักผ้า', 'ที่จอดรถ'
]));

// Description
formData.append('description', 'หอพักใหม่ สะอาด ปลอดภัย');

// Send request
const response = await fetch('/api/submissions', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

---

## สถานะของ API

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/zones` | GET | ✅ พร้อมใช้งาน |
| `/api/dormitories/amenities` | GET | ✅ พร้อมใช้งาน |
| `/api/submissions` | POST | ⚠️ ต้องสร้างใหม่ |

---

## หมายเหตุสำหรับทีมพัฒนา

### Frontend:
- ใช้ Angular Reactive Forms
- 4-step wizard with validation
- Image preview with drag-and-drop
- MapTiler integration
- Toast notifications
- Responsive design

### Backend (ต้องทำ):
1. สร้าง API endpoint: `POST /api/submissions`
2. ใช้ multer สำหรับ upload รูปภาพ
3. Upload รูปไป Supabase Storage
4. บันทึกข้อมูลลง database (3 ตาราง)
5. Validate ข้อมูลตามกฎที่กำหนด
6. ส่ง response กลับไป

### Database:
- ต้องปรับ schema ของ `raw_submissions` ให้ตรงกับฟิลด์ใหม่
- สร้างตาราง `submission_images` สำหรับเก็บรูปภาพ
- สร้างตาราง `submission_amenities` สำหรับเก็บสิ่งอำนวยความสะดวก
