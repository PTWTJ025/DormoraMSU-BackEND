-- อัพเดท schema สำหรับระบบรับข้อมูลหอพักจากฟอร์มหน้าบ้าน
-- Phase 1: Form Submission + Phase 2: Admin Management

-- 1. ลบตารางเก่าที่ไม่ตรงกับความต้องการ (ถ้ามี)
DROP TABLE IF EXISTS submission_amenities CASCADE;
DROP TABLE IF EXISTS submission_images CASCADE;

-- 2. ปรับโครงสร้างตาราง raw_submissions
ALTER TABLE raw_submissions 
  -- เพิ่มฟิลด์ใหม่สำหรับ room type
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS room_type_other VARCHAR(100),
  
  -- เพิ่มฟิลด์ราคาแยกชัดเจน
  ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS daily_price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS summer_price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS deposit DECIMAL(10, 2);

-- ลบฟิลด์เก่าที่ไม่ใช้แล้ว (ทีละฟิลด์เพื่อไม่ให้ error)
ALTER TABLE raw_submissions DROP COLUMN IF EXISTS price_info;
ALTER TABLE raw_submissions DROP COLUMN IF EXISTS amenities;
ALTER TABLE raw_submissions DROP COLUMN IF EXISTS image_urls;

-- ลบ constraint เก่า (ถ้ามี)
ALTER TABLE raw_submissions DROP CONSTRAINT IF EXISTS check_at_least_one_price;

-- เพิ่ม constraint ตรวจสอบว่าต้องมีราคาอย่างน้อย 1 รายการ
ALTER TABLE raw_submissions
  ADD CONSTRAINT check_at_least_one_price 
  CHECK (monthly_price IS NOT NULL OR daily_price IS NOT NULL);

-- 3. สร้างตาราง submission_images (เก็บรูปภาพของ submission)
CREATE TABLE IF NOT EXISTS submission_images (
    image_id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES raw_submissions(submission_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง index สำหรับค้นหาเร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_submission_images_submission_id ON submission_images(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_images_primary ON submission_images(submission_id, is_primary);

-- 4. สร้างตาราง submission_amenities (เก็บสิ่งอำนวยความสะดวกของ submission)
CREATE TABLE IF NOT EXISTS submission_amenities (
    submission_id INTEGER NOT NULL REFERENCES raw_submissions(submission_id) ON DELETE CASCADE,
    amenity_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (submission_id, amenity_name)
);

-- สร้าง index สำหรับค้นหาเร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_submission_amenities_submission_id ON submission_amenities(submission_id);

-- 5. เพิ่ม comment อธิบายตาราง
COMMENT ON TABLE raw_submissions IS 'เก็บข้อมูลดิบจากฟอร์มส่งข้อมูลหอพัก (ยังไม่ได้ตรวจสอบ)';
COMMENT ON TABLE submission_images IS 'เก็บรูปภาพของ submission แต่ละรายการ';
COMMENT ON TABLE submission_amenities IS 'เก็บสิ่งอำนวยความสะดวกของ submission แต่ละรายการ';

-- 6. แสดงผลสำเร็จ
SELECT 'Schema updated successfully!' AS message;
