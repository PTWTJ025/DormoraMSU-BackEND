// Supabase Storage Service
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Upload image to Supabase Storage
exports.uploadImage = async (file) => {
  try {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
    const filePath = fileName; // ไม่ต้องใส่ folder prefix
    
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
      
    console.log('Image uploaded successfully:', publicUrl);
    return publicUrl;
    
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Delete image from Supabase Storage
exports.deleteImage = async (imageUrl) => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = fileName; // ไม่ต้องใส่ folder prefix
    
    const { error } = await supabase.storage
      .from('dormitory-images')
      .remove([filePath]);
      
    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }
    
    console.log('Image deleted successfully:', filePath);
    return true;
    
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

// Upload multiple images
exports.uploadMultipleImages = async (files) => {
  try {
    const uploadPromises = files.map(file => this.uploadImage(file));
    const imageUrls = await Promise.all(uploadPromises);
    return imageUrls;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};