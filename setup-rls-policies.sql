-- Setup Row Level Security (RLS) Policies
-- Run in Supabase SQL Editor

-- 1. Enable RLS for all tables except zones
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_dormitories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dormitory_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE dormitory_amenities ENABLE ROW LEVEL SECURITY;

-- 2. Policies for admins table
-- Only authenticated admins can access admin data
CREATE POLICY "Admins can view own data" ON admins
    FOR SELECT USING (auth.uid()::text = firebase_uid);

CREATE POLICY "Admins can update own data" ON admins
    FOR UPDATE USING (auth.uid()::text = firebase_uid);

-- 3. Policies for raw_submissions table
-- Only admins can access raw submissions
CREATE POLICY "Admins can view all submissions" ON raw_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE firebase_uid = auth.uid()::text 
            AND is_active = true
        )
    );

CREATE POLICY "Admins can update submissions" ON raw_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE firebase_uid = auth.uid()::text 
            AND is_active = true
        )
    );

-- Anyone can insert new submissions (public form)
CREATE POLICY "Anyone can submit dormitory data" ON raw_submissions
    FOR INSERT WITH CHECK (true);

-- 4. Policies for approved_dormitories table
-- Public can read approved dormitories
CREATE POLICY "Public can view approved dormitories" ON approved_dormitories
    FOR SELECT USING (status = 'active');

-- Only admins can modify approved dormitories
CREATE POLICY "Admins can manage approved dormitories" ON approved_dormitories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE firebase_uid = auth.uid()::text 
            AND is_active = true
        )
    );

-- 5. Policies for dormitory_images table
-- Public can view images of approved dormitories
CREATE POLICY "Public can view dormitory images" ON dormitory_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM approved_dormitories 
            WHERE dorm_id = dormitory_images.dorm_id 
            AND status = 'active'
        )
    );

-- Only admins can manage images
CREATE POLICY "Admins can manage dormitory images" ON dormitory_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE firebase_uid = auth.uid()::text 
            AND is_active = true
        )
    );

-- 6. Policies for dormitory_amenities table
-- Public can view amenities of approved dormitories
CREATE POLICY "Public can view dormitory amenities" ON dormitory_amenities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM approved_dormitories 
            WHERE dorm_id = dormitory_amenities.dorm_id 
            AND status = 'active'
        )
    );

-- Only admins can manage amenities
CREATE POLICY "Admins can manage dormitory amenities" ON dormitory_amenities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE firebase_uid = auth.uid()::text 
            AND is_active = true
        )
    );

-- 7. zones table remains public (no RLS)
-- Everyone can read zones for the form