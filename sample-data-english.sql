-- Insert sample data (English version to avoid encoding issues)
-- Run in Supabase SQL Editor

-- 1. Insert sample admin
INSERT INTO admins (firebase_uid, username, email, display_name) VALUES 
('sample-firebase-uid-123', 'admin', 'admin@dormitory.com', 'System Admin');

-- 2. Insert sample raw submissions
INSERT INTO raw_submissions (
    dorm_name, address, description, contact_name, contact_phone, contact_email,
    price_info, zone_name, latitude, longitude, amenities, image_urls, status
) VALUES 
(
    'ABC Dormitory',
    '123 Ramkhamhaeng Road, Huamark, Bangkapi, Bangkok 10240',
    'Clean and safe dormitory near university with full facilities',
    'Mr. Somchai Jaidee',
    '081-234-5678',
    'somchai@email.com',
    '2500-3500 THB/month',
    'Near University',
    13.7563,
    100.5018,
    'Air conditioning, WiFi, Parking, Elevator, Refrigerator, Washing machine',
    ARRAY['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    'pending'
),
(
    'XYZ Apartment',
    '456 Sukhumvit Road, Klongtan, Bangkok 10110',
    'Luxury dormitory in city center near BTS and MRT',
    'Ms. Somying Raksaad',
    '082-345-6789',
    'somying@email.com',
    '4000-6000 THB/month',
    'City Center',
    13.7307,
    100.5418,
    'Air conditioning, WiFi, Parking, Swimming pool, Fitness, 24h Security',
    ARRAY['https://example.com/image3.jpg', 'https://example.com/image4.jpg'],
    'pending'
),
(
    'DEF Residence',
    '789 Phahonyothin Road, Chatuchak, Bangkok 10900',
    'New clean and safe dormitory, budget-friendly for students',
    'Mr. Somsak Prayad',
    '083-456-7890',
    'somsak@email.com',
    '1800-2800 THB/month',
    'Near Train Station',
    13.8121,
    100.5529,
    'Air conditioning, WiFi, Parking, Shared refrigerator',
    ARRAY['https://example.com/image5.jpg'],
    'pending'
);