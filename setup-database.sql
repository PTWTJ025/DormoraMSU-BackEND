-- Complete database setup for DormRoomaroo
-- Run this in Supabase SQL Editor

-- ===== 1. CREATE TABLES =====

-- admins table
CREATE TABLE IF NOT EXISTS admins (
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

-- zones table
CREATE TABLE IF NOT EXISTS zones (
    zone_id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- raw_submissions table (raw data from form)
CREATE TABLE IF NOT EXISTS raw_submissions (
    submission_id SERIAL PRIMARY KEY,
    
    -- dormitory info
    dorm_name VARCHAR(255) NOT NULL,
    address TEXT,
    description TEXT,
    
    -- contact info
    contact_name VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    line_id VARCHAR(100),
    
    -- price info
    price_info TEXT,
    
    -- location
    zone_name VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- amenities
    amenities TEXT,
    
    -- images (array of URLs)
    image_urls TEXT[],
    
    -- status
    status VARCHAR(50) DEFAULT 'pending',
    
    -- admin management
    processed_by INTEGER REFERENCES admins(admin_id),
    processed_date TIMESTAMP,
    admin_notes TEXT,
    rejection_reason TEXT,
    
    submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- approved_dormitories table (approved data)
CREATE TABLE IF NOT EXISTS approved_dormitories (
    dorm_id SERIAL PRIMARY KEY,
    
    -- reference to source
    source_submission_id INTEGER REFERENCES raw_submissions(submission_id),
    
    -- dormitory info (edited by admin)
    dorm_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    
    -- owner info
    owner_name VARCHAR(255),
    owner_phone VARCHAR(20),
    owner_email VARCHAR(255),
    owner_line_id VARCHAR(100),
    
    -- price
    min_price INTEGER,
    max_price INTEGER,
    price_display TEXT,
    
    -- location
    zone_id INTEGER REFERENCES zones(zone_id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- status
    status VARCHAR(50) DEFAULT 'active',
    
    -- approval info
    approved_by INTEGER REFERENCES admins(admin_id),
    approved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- dormitory_images table
CREATE TABLE IF NOT EXISTS dormitory_images (
    image_id SERIAL PRIMARY KEY,
    dorm_id INTEGER REFERENCES approved_dormitories(dorm_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- dormitory_amenities table
CREATE TABLE IF NOT EXISTS dormitory_amenities (
    amenity_id SERIAL PRIMARY KEY,
    dorm_id INTEGER REFERENCES approved_dormitories(dorm_id) ON DELETE CASCADE,
    amenity_name VARCHAR(100) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);

-- ===== 2. INSERT THAI ZONES =====

-- Delete existing zones first
DELETE FROM zones;

-- Insert Thai zones
INSERT INTO zones (zone_name) VALUES 
('กู่แก้ว'),
('ขามเรียง'),
('ดอนนา'),
('ท่าขอนยาง'),
('หน้ามอ');

-- ===== 3. INSERT ADMIN USER =====

-- Delete existing admin first (optional, comment out if you want to keep existing)
-- DELETE FROM admins WHERE firebase_uid = 'qbzxXXEgQNgMWkzw6mmzduroAlx2';

-- Insert admin user with your Firebase UID
INSERT INTO admins (firebase_uid, username, email, display_name, is_active) 
VALUES ('qbzxXXEgQNgMWkzw6mmzduroAlx2', 'admin', 'admin@dormitory.com', 'Admin User', TRUE)
ON CONFLICT (firebase_uid) DO NOTHING;

-- ===== 4. INSERT SAMPLE DATA =====

-- Insert sample raw submissions
INSERT INTO raw_submissions (
    dorm_name, address, description, contact_name, contact_phone, contact_email,
    price_info, zone_name, latitude, longitude, amenities, image_urls, status
) VALUES 
(
    'หอพัก ABC',
    '123 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240',
    'หอพักสะอาด ปลอดภัย ใกล้มหาวิทยาลัย มีสิ่งอำนวยความสะดวกครบครัน',
    'คุณสมชาย ใจดี',
    '081-234-5678',
    'somchai@email.com',
    '2500-3500 บาท/เดือน',
    'กู่แก้ว',
    13.7563,
    100.5018,
    'แอร์, WiFi, ที่จอดรถ, ลิฟต์, ตู้เย็น, เครื่องซักผ้า',
    ARRAY['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    'pending'
),
(
    'หอพัก XYZ Apartment',
    '456 ถนนสุขุมวิท แขวงคลองตัน เขตคลองตัน กรุงเทพฯ 10110',
    'หอพักหรู ใจกลางเมือง ใกล้ BTS และ MRT สะดวกสบาย',
    'คุณสมหญิง รักสะอาด',
    '082-345-6789',
    'somying@email.com',
    '4000-6000 บาท/เดือน',
    'ขามเรียง',
    13.7307,
    100.5418,
    'แอร์, WiFi, ที่จอดรถ, สระว่ายน้ำ, ฟิตเนส, รปภ. 24 ชม.',
    ARRAY['https://example.com/image3.jpg', 'https://example.com/image4.jpg'],
    'pending'
),
(
    'หอพัก DEF Residence',
    '789 ถนนพหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900',
    'หอพักใหม่ สะอาด ปลอดภัย ราคาประหยัด เหมาะสำหรับนักศึกษา',
    'คุณสมศักดิ์ ประหยัด',
    '083-456-7890',
    'somsak@email.com',
    '1800-2800 บาท/เดือน',
    'ดอนนา',
    13.8121,
    100.5529,
    'แอร์, WiFi, ที่จอดรถ, ตู้เย็นส่วนกลาง',
    ARRAY['https://example.com/image5.jpg'],
    'pending'
);

-- ===== 5. APPROVE SAMPLE DORMITORY =====

-- Update first submission to approved
UPDATE raw_submissions 
SET status = 'approved', 
    processed_by = (SELECT admin_id FROM admins WHERE firebase_uid = 'qbzxXXEgQNgMWkzw6mmzduroAlx2' LIMIT 1),
    processed_date = NOW(),
    admin_notes = 'ข้อมูลครบถ้วน ตรวจสอบแล้ว'
WHERE dorm_name = 'หอพัก ABC' AND status = 'pending';

-- Insert approved dormitory
INSERT INTO approved_dormitories (
    source_submission_id, dorm_name, address, description,
    owner_name, owner_phone, owner_email,
    min_price, max_price, price_display,
    zone_id, latitude, longitude, status,
    approved_by
) 
SELECT 
    submission_id,
    dorm_name,
    address,
    description,
    contact_name,
    contact_phone,
    contact_email,
    2500,
    3500,
    '2,500-3,500 บาท/เดือน',
    (SELECT zone_id FROM zones WHERE zone_name = 'กู่แก้ว'),
    latitude,
    longitude,
    'active',
    (SELECT admin_id FROM admins WHERE firebase_uid = 'qbzxXXEgQNgMWkzw6mmzduroAlx2' LIMIT 1)
FROM raw_submissions 
WHERE dorm_name = 'หอพัก ABC' AND status = 'approved'
ON CONFLICT DO NOTHING;

-- ===== 6. INSERT DORMITORY IMAGES =====

INSERT INTO dormitory_images (dorm_id, image_url, is_primary) 
SELECT 
    dorm_id,
    'https://example.com/image1.jpg',
    true
FROM approved_dormitories 
WHERE dorm_name = 'หอพัก ABC'
ON CONFLICT DO NOTHING;

INSERT INTO dormitory_images (dorm_id, image_url, is_primary) 
SELECT 
    dorm_id,
    'https://example.com/image2.jpg',
    false
FROM approved_dormitories 
WHERE dorm_name = 'หอพัก ABC'
ON CONFLICT DO NOTHING;

-- ===== 7. INSERT DORMITORY AMENITIES =====

INSERT INTO dormitory_amenities (dorm_id, amenity_name) 
SELECT dorm_id, 'แอร์' FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'
UNION ALL
SELECT dorm_id, 'WiFi' FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'
UNION ALL
SELECT dorm_id, 'ที่จอดรถ' FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'
UNION ALL
SELECT dorm_id, 'ลิฟต์' FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'
UNION ALL
SELECT dorm_id, 'ตู้เย็น' FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'
UNION ALL
SELECT dorm_id, 'เครื่องซักผ้า' FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'
ON CONFLICT DO NOTHING;
