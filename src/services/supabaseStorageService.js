// Supabase Storage Service
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Upload image to Supabase Storage
// เก็บรูปตามโครงสร้าง: dormitory-images/{dormId}/{fileName}
exports.uploadImage = async (file, dormId) => {
  try {
    if (!dormId) {
      throw new Error('dormId is required for image upload');
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
    const filePath = `${dormId}/${fileName}`; // เก็บใน folder ตาม dormId
    
    const { data, error } = await supabase.storage
      .from('dormitory-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });
      
    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('dormitory-images')
      .getPublicUrl(filePath);
      
    console.log(`✅ Image uploaded successfully to dormitory ${dormId}:`, publicUrl);
    return publicUrl;
    
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Delete image from Supabase Storage
// รองรับทั้ง path แบบเก่า (root) และแบบใหม่ (folder structure)
exports.deleteImage = async (imageUrl) => {
  try {
    // Extract file path from URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/dormitory-images/{dormId}/{fileName}
    // หรือ: https://xxx.supabase.co/storage/v1/object/public/dormitory-images/{fileName} (แบบเก่า)
    const urlParts = imageUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'dormitory-images');
    
    if (bucketIndex === -1) {
      throw new Error('Invalid image URL format');
    }
    
    // ดึง path หลังจาก 'dormitory-images' (อาจจะเป็น {dormId}/{fileName} หรือ {fileName})
    const filePath = urlParts.slice(bucketIndex + 1).join('/');
    
    const { error } = await supabase.storage
      .from('dormitory-images')
      .remove([filePath]);
      
    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }
    
    console.log('✅ Image deleted successfully:', filePath);
    return true;
    
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

// Upload multiple images
exports.uploadMultipleImages = async (files, dormId) => {
  try {
    if (!dormId) {
      throw new Error('dormId is required for multiple image upload');
    }
    const uploadPromises = files.map(file => this.uploadImage(file, dormId));
    const imageUrls = await Promise.all(uploadPromises);
    return imageUrls;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};

// Move image from dorm-drafts/ to {dormId}/ folder
// Frontend อัปโหลดรูปไป dorm-drafts/ ก่อน แล้ว Backend จะย้ายไป {dormId}/ หลังจากสร้าง dormitory
exports.moveImageToDormitoryFolder = async (imagePath, dormId) => {
  try {
    if (!dormId) {
      throw new Error('dormId is required for moving image');
    }

    // imagePath อาจจะเป็น:
    // - "dorm-drafts/uuid-1.jpg" (path ใน bucket)
    // - หรือ full URL "https://xxx.supabase.co/storage/v1/object/public/dormitory-images/dorm-drafts/uuid-1.jpg"
    
    let sourcePath = imagePath;
    
    // ถ้าเป็น URL ให้ extract path
    if (imagePath.includes('/storage/v1/object/public/dormitory-images/')) {
      const urlParts = imagePath.split('/dormitory-images/');
      if (urlParts.length > 1) {
        sourcePath = urlParts[1];
      }
    }

    // ตรวจสอบว่า path เริ่มต้นด้วย "dorm-drafts/" หรือไม่
    if (!sourcePath.startsWith('dorm-drafts/')) {
      // ถ้าไม่ใช่ dorm-drafts/ อาจจะอยู่ใน folder อื่นแล้ว หรือเป็น path แบบเก่า
      // ถ้าเป็น path แบบเก่า (ไม่มี folder) ให้ย้ายไป {dormId}/
      const fileName = sourcePath.split('/').pop();
      sourcePath = fileName; // ใช้แค่ชื่อไฟล์
    }

    // ดึงชื่อไฟล์จาก sourcePath
    const fileName = sourcePath.split('/').pop();
    const destinationPath = `${dormId}/${fileName}`;

    // ดาวน์โหลดไฟล์จาก source path
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('dormitory-images')
      .download(sourcePath);

    if (downloadError) {
      console.error('Error downloading file from dorm-drafts:', downloadError);
      throw downloadError;
    }

    // หา content type จาก file extension หรือใช้ default
    let contentType = 'image/jpeg'; // default
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const contentTypeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif'
    };
    if (fileExtension && contentTypeMap[fileExtension]) {
      contentType = contentTypeMap[fileExtension];
    }

    // อัปโหลดไปที่ destination path
    const { error: uploadError } = await supabase.storage
      .from('dormitory-images')
      .upload(destinationPath, fileData, {
        contentType: contentType,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file to dormitory folder:', uploadError);
      throw uploadError;
    }

    // ลบไฟล์เก่าจาก dorm-drafts/
    if (sourcePath.startsWith('dorm-drafts/')) {
      const { error: deleteError } = await supabase.storage
        .from('dormitory-images')
        .remove([sourcePath]);
      
      if (deleteError) {
        console.warn('Warning: Failed to delete source file from dorm-drafts:', deleteError);
        // ไม่ throw error เพราะไฟล์ใหม่ถูกอัปโหลดสำเร็จแล้ว
      }
    }

    // Get public URL ของไฟล์ใหม่
    const { data: { publicUrl } } = supabase.storage
      .from('dormitory-images')
      .getPublicUrl(destinationPath);

    console.log(`✅ Image moved from ${sourcePath} to ${destinationPath}`);
    return publicUrl;

  } catch (error) {
    console.error('Error moving image to dormitory folder:', error);
    throw error;
  }
};