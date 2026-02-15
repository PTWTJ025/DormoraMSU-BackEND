-- สร้างตารางสำหรับระบบจัดการหอพักใหม่
-- ใช้ใน Supabase SQL Editor

-- 1. ตาราง admins
CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตาราง zones
CREATE TABLE zones (
    zone_id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. ตาราง raw_submissions (ข้อมูลดิบจากฟอร์ม)
CREATE TABLE raw_submissions (
    submission_id SERIAL PRIMARY KEY,
    
    -- ข้อมูลหอพัก
    dorm_name VARCHAR(255) NOT NULL,
    address TEXT,
    description TEXT,
    
    -- ข้อมูลเจ้าของ/ผู้ส่ง
    contact_name VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    line_id VARCHAR(100),
    
    -- ราคา
    price_info TEXT, -- "1500-3000 บาท/เดือน"
    
    -- ที่ตั้ง
    zone_name VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- สิ่งอำนวยความสะดวก
    amenities TEXT, -- "แอร์, WiFi, ที่จอดรถ"
    
    -- รูปภาพ (เก็บเป็น array ของ URLs)
    image_urls TEXT[],
    
    -- สถานะ
    status VARCHAR(50) DEFAULT 'รอตรวจสอบ', -- รอตรวจสอบ, อนุมัติ, ปฏิเสธ
    
    -- การจัดการ
    processed_by INTEGER REFERENCES admins(admin_id),
    processed_date TIMESTAMP,
    admin_notes TEXT,
    rejection_reason TEXT,
    
    submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ตาราง approved_dormitories (ข้อมูลที่อนุมัติแล้ว)
CREATE TABLE approved_dormitories (
    dorm_id SERIAL PRIMARY KEY,
    
    -- อ้างอิงข้อมูลต้นทาง
    source_submission_id INTEGER REFERENCES raw_submissions(submission_id),
    
    -- ข้อมูลหอพัก (ที่ admin แก้ไขแล้ว)
    dorm_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    
    -- ข้อมูลเจ้าของ
    owner_name VARCHAR(255),
    owner_phone VARCHAR(20),
    owner_email VARCHAR(255),
    owner_line_id VARCHAR(100),
    
    -- ราคา
    min_price INTEGER,
    max_price INTEGER,
    price_display TEXT, -- สำหรับแสดงผล
    
    -- ที่ตั้ง
    zone_id INTEGER REFERENCES zones(zone_id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- สถานะ
    status VARCHAR(50) DEFAULT 'เปิดใช้งาน',
    
    -- การอนุมัติ
    approved_by INTEGER REFERENCES admins(admin_id),
    approved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. ตาราง dormitory_images
CREATE TABLE dormitory_images (
    image_id SERIAL PRIMARY KEY,
    dorm_id INTEGER REFERENCES approved_dormitories(dorm_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ตาราง dormitory_amenities
CREATE TABLE dormitory_amenities (
    amenity_id SERIAL PRIMARY KEY,
    dorm_id INTEGER REFERENCES approved_dormitories(dorm_id) ON DELETE CASCADE,
    amenity_name VARCHAR(100) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);

-- เพิ่มข้อมูลโซนเริ่มต้น
INSERT INTO zones (zone_name) VALUES 
('ใกล้มหาวิทยาลัย'),
('ใจกลางเมือง'),
('ย่านธุรกิจ'),
('ย่านที่อยู่อาศัย'),
('ใกล้สถานีรถไฟ'),
('ใกล้ห้างสรรพสินค้า');

-- สร้าง admin ตัวอย่าง (ใช้ Firebase UID จริงของคุณ)
-- INSERT INTO admins (firebase_uid, username, email, display_name) 
-- VALUES ('your-firebase-uid', 'admin', 'admin@dormitory.com', 'System Admin');