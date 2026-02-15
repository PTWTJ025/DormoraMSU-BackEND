// Test Supabase Storage Service
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testStorage() {
  try {
    console.log('🧪 Testing Supabase Storage...');
    
    // 1. List all buckets
    console.log('\n📁 Listing buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
    } else {
      console.log('✅ Buckets:', buckets.map(b => b.name));
    }
    
    // 2. Check if dormitory-images bucket exists
    const bucketExists = buckets?.find(b => b.name === 'dormitory-images');
    if (!bucketExists) {
      console.log('\n🔧 Creating dormitory-images bucket...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('dormitory-images', {
        public: true
      });
      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        return;
      }
      console.log('✅ Bucket created:', newBucket);
    } else {
      console.log('✅ dormitory-images bucket already exists');
    }
    
    // 3. Create a test image file
    const testImageContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const fileName = `test-${Date.now()}.png`;
    
    // 4. Upload test image
    console.log('\n📤 Uploading test image...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dormitory-images')
      .upload(fileName, testImageContent, {
        contentType: 'image/png'
      });
      
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return;
    }
    
    console.log('✅ Upload successful:', uploadData);
    
    // 5. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('dormitory-images')
      .getPublicUrl(fileName);
      
    console.log('🔗 Public URL:', publicUrl);
    
    // 6. Insert image record to database
    console.log('\n💾 Inserting image record to database...');
    const pool = require('./src/db');
    const result = await pool.query(
      'INSERT INTO dormitory_images (dorm_id, image_url, is_primary) VALUES ($1, $2, $3) RETURNING *',
      [1, publicUrl, false] // dorm_id = 1 (ABC Dormitory)
    );
    
    console.log('✅ Database record created:', result.rows[0]);
    
    // 7. Test listing files in bucket
    console.log('\n📋 Listing files in bucket...');
    const { data: files, error: listError } = await supabase.storage
      .from('dormitory-images')
      .list();
      
    if (listError) {
      console.error('❌ List error:', listError);
    } else {
      console.log('✅ Files in bucket:', files.map(f => f.name));
    }
    
    console.log('\n🎉 Storage test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testStorage();