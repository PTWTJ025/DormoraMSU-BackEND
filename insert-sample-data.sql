-- Insert sample data for testing
-- Run in Supabase SQL Editor

-- 1. Insert sample admin (use your real Firebase UID later)
INSERT INTO admins (firebase_uid, username, email, display_name) VALUES 
('sample-firebase-uid-123', 'admin', 'admin@dormitory.com', 'System Admin');

-- 2. Insert sample raw submissions (as if people submitted via form)
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
    'Near University',
    13.7563,
    100.5018,
    'แอร์, WiFi, ที่จอดรถ, ลิฟต์, ตู้เย็น, เครื่องซักผ้า',
    ARRAY['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    'รอตรวจสอบ'
),
(
    'หอพัก XYZ Apartment',
    '456 ถนนสุขุมวิท แขวงคลองตัน เขตคลองตัน กรุงเทพฯ 10110',
    'หอพักหรู ใจกลางเมือง ใกล้ BTS และ MRT สะดวกสบาย',
    'คุณสมหญิง รักสะอาด',
    '082-345-6789',
    'somying@email.com',
    '4000-6000 บาท/เดือน',
    'City Center',
    13.7307,
    100.5418,
    'แอร์, WiFi, ที่จอดรถ, สระว่ายน้ำ, ฟิตเนส, รปภ. 24 ชม.',
    ARRAY['https://example.com/image3.jpg', 'https://example.com/image4.jpg'],
    'รอตรวจสอบ'
),
(
    'หอพัก DEF Residence',
    '789 ถนนพหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900',
    'หอพักใหม่ สะอาด ปลอดภัย ราคาประหยัด เหมาะสำหรับนักศึกษา',
    'คุณสมศักดิ์ ประหยัด',
    '083-456-7890',
    'somsak@email.com',
    '1800-2800 บาท/เดือน',
    'Near Train Station',
    13.8121,
    100.5529,
    'แอร์, WiFi, ที่จอดรถ, ตู้เย็นส่วนกลาง',
    ARRAY['https://example.com/image5.jpg'],
    'รอตรวจสอบ'
);

-- 3. Approve one dormitory (simulate admin approval)
-- First, let's approve the first submission
UPDATE raw_submissions 
SET status = 'อนุมัติ', 
    processed_by = (SELECT admin_id FROM admins LIMIT 1),
    processed_date = NOW(),
    admin_notes = 'ข้อมูลครบถ้วน ตรวจสอบแล้ว'
WHERE dorm_name = 'หอพัก ABC';

-- 4. Insert approved dormitory data
INSERT INTO approved_dormitories (
    source_submission_id, dorm_name, address, description,
    owner_name, owner_phone, owner_email,
    min_price, max_price, price_display,
    zone_id, latitude, longitude, status,
    approved_by
) VALUES (
    (SELECT submission_id FROM raw_submissions WHERE dorm_name = 'หอพัก ABC'),
    'หอพัก ABC',
    '123 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพฯ 10240',
    'หอพักสะอาด ปลอดภัย ใกล้มหาวิทยาลัย มีสิ่งอำนวยความสะดวกครบครัน',
    'คุณสมชาย ใจดี',
    '081-234-5678',
    'somchai@email.com',
    2500,
    3500,
    '2,500-3,500 บาท/เดือน',
    (SELECT zone_id FROM zones WHERE zone_name = 'Near University'),
    13.7563,
    100.5018,
    'active',
    (SELECT admin_id FROM admins LIMIT 1)
);

-- 5. Insert dormitory images
INSERT INTO dormitory_images (dorm_id, image_url, is_primary) VALUES 
(
    (SELECT dorm_id FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'),
    'https://example.com/image1.jpg',
    true
),
(
    (SELECT dorm_id FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'),
    'https://example.com/image2.jpg',
    false
);

-- 6. Insert dormitory amenities
INSERT INTO dormitory_amenities (dorm_id, amenity_name) VALUES 
((SELECT dorm_id FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'), 'แอร์'),
((SELECT dorm_id FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'), 'WiFi'),
((SELECT dorm_id FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'), 'ที่จอดรถ'),
((SELECT dorm_id FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'), 'ลิฟต์'),
((SELECT dorm_id FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'), 'ตู้เย็น'),
((SELECT dorm_id FROM approved_dormitories WHERE dorm_name = 'หอพัก ABC'), 'เครื่องซักผ้า');