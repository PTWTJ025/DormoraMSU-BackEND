// Test our Supabase Storage Service
require('dotenv').config();
const storageService = require('./src/services/supabaseStorageService');

async function testUploadService() {
  try {
    console.log('🧪 Testing Upload Service...');
    
    // Create mock file object (like multer would provide)
    const mockFile = {
      originalname: 'test-dormitory.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
    };
    
    // Test single upload
    console.log('\n📤 Testing single image upload...');
    const imageUrl = await storageService.uploadImage(mockFile);
    console.log('✅ Upload successful:', imageUrl);
    
    // Test multiple uploads
    console.log('\n📤 Testing multiple image uploads...');
    const mockFiles = [
      {
        originalname: 'room1.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
      },
      {
        originalname: 'room2.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
      }
    ];
    
    const imageUrls = await storageService.uploadMultipleImages(mockFiles);
    console.log('✅ Multiple uploads successful:', imageUrls);
    
    // Insert to database
    console.log('\n💾 Inserting images to database...');
    const pool = require('./src/db');
    
    // Insert single image
    await pool.query(
      'INSERT INTO dormitory_images (dorm_id, image_url, is_primary) VALUES ($1, $2, $3)',
      [1, imageUrl, true] // Set as primary image
    );
    
    // Insert multiple images
    for (let i = 0; i < imageUrls.length; i++) {
      await pool.query(
        'INSERT INTO dormitory_images (dorm_id, image_url, is_primary) VALUES ($1, $2, $3)',
        [1, imageUrls[i], false]
      );
    }
    
    // Check database
    const result = await pool.query(
      'SELECT image_id, image_url, is_primary FROM dormitory_images WHERE dorm_id = 1 ORDER BY upload_date DESC'
    );
    
    console.log('✅ Images in database:');
    result.rows.forEach(row => {
      console.log(`  - ${row.is_primary ? '🌟' : '📷'} ${row.image_url}`);
    });
    
    console.log('\n🎉 Upload service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testUploadService();