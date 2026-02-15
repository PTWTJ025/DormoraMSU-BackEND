-- Create tables for new dormitory management system
-- Use in Supabase SQL Editor

-- 1. admins table
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

-- 2. zones table
CREATE TABLE zones (
    zone_id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. raw_submissions table (raw data from form)
CREATE TABLE raw_submissions (
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

-- 4. approved_dormitories table (approved data)
CREATE TABLE approved_dormitories (
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

-- 5. dormitory_images table
CREATE TABLE dormitory_images (
    image_id SERIAL PRIMARY KEY,
    dorm_id INTEGER REFERENCES approved_dormitories(dorm_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. dormitory_amenities table
CREATE TABLE dormitory_amenities (
    amenity_id SERIAL PRIMARY KEY,
    dorm_id INTEGER REFERENCES approved_dormitories(dorm_id) ON DELETE CASCADE,
    amenity_name VARCHAR(100) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);

-- Insert default zones
INSERT INTO zones (zone_name) VALUES 
('Near University'),
('City Center'),
('Business District'),
('Residential Area'),
('Near Train Station'),
('Near Shopping Mall');