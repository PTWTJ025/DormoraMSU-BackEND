-- อัพเดทสิ่งอำนวยความสะดวกตามรายการใหม่
-- ลบข้อมูลเก่าออกก่อน
DELETE FROM dormitory_amenities;

-- เพิ่มสิ่งอำนวยความสะดวกใหม่สำหรับหอพัก ABC Dormitory (dorm_id = 1)
INSERT INTO dormitory_amenities (dorm_id, amenity_name, is_available) VALUES
(1, 'แอร์', true),
(1, 'พัดลม', true),
(1, 'TV', true),
(1, 'ตู้เย็น', true),
(1, 'เตียงนอน', true),
(1, 'WIFI', true),
(1, 'ตู้เสื้อผ้า', true),
(1, 'โต๊ะทำงาน', true),
(1, 'ไมโครเวฟ', true),
(1, 'เครื่องทำน้ำอุ่น', true),
(1, 'ซิงค์ล้างจาน', true),
(1, 'โต๊ะเครื่องแป้ง', true),
(1, 'กล้องวงจรปิด', true),
(1, 'รปภ.', true),
(1, 'ลิฟต์', true),
(1, 'ที่จอดรถ', true),
(1, 'ฟิตเนส', true),
(1, 'Lobby', true),
(1, 'ผู้ดำหยอดเหรียญ', true),
(1, 'สระว่ายน้ำ', true),
(1, 'ที่วางพัสดุ', true),
(1, 'อนุญาตให้เลี้ยงสัตว์', true),
(1, 'คีย์การ์ด', true),
(1, 'เครื่องซักผ้า', true);

-- ตรวจสอบผลลัพธ์
SELECT COUNT(*) as total_amenities FROM dormitory_amenities WHERE dorm_id = 1;