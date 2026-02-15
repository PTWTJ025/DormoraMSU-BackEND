// src/controllers/submissionController.js
// ระบบใหม่: ส่งข้อมูลตรงเข้า dormitories table (status = pending)

const pool = require("../db");
const supabaseStorage = require("../services/supabaseStorageService");

// ===== PUBLIC FORM SUBMISSION =====

// รับข้อมูลจากฟอร์มหน้าบ้าน
exports.submitDormitory = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. ดึงข้อมูลจาก FormData
    const {
      // Step 1: Basic Info
      dorm_name,
      address,
      zone_id,
      
      // Step 2: Contact Info (optional)
      contact_name,
      contact_phone,
      contact_email,
      line_id,
      
      // Step 3: Room Type & Pricing
      room_type,
      monthly_price,
      daily_price,
      summer_price,
      deposit,
      
      // Step 4: Utilities
      electricity_price,
      water_price_type,
      water_price,
      
      // Step 5: Location & Additional
      latitude,
      longitude,
      amenities, // JSON string หรือ array
      dorm_description,
      description, // รองรับทั้ง description และ dorm_description
      primary_image_index
    } = req.body;

    // ใช้ dorm_description หรือ description (รองรับทั้ง 2 แบบ)
    const finalDescription = dorm_description || description;

    console.log('📝 [submitDormitory] Received data:', {
      dorm_name,
      address,
      zone_id,
      room_type,
      monthly_price,
      daily_price,
      summer_price,
      deposit,
      electricity_price,
      water_price_type,
      water_price,
      latitude,
      longitude,
      amenities: typeof amenities,
      files_count: req.files?.length,
      primary_image_index,
      all_body_keys: Object.keys(req.body)
    });

    // 2. Validate required fields
    const errors = {};
    
    if (!dorm_name || dorm_name.trim().length < 3) {
      errors.dorm_name = "ชื่อหอพักต้องมีอย่างน้อย 3 ตัวอักษร";
    }
    
    if (!address || address.trim().length < 10) {
      errors.address = "ที่อยู่ต้องมีอย่างน้อย 10 ตัวอักษร";
    }
    
    if (!zone_id) {
      errors.zone_id = "กรุณาเลือกโซน";
    }
    
    if (!room_type) {
      errors.room_type = "กรุณาเลือกประเภทห้อง";
    }
    
    if (!monthly_price && !daily_price) {
      errors.price = "กรุณากรอกราคาอย่างน้อย 1 รายการ (ต่อเดือนหรือต่อวัน)";
    }
    
    if (!latitude || !longitude) {
      errors.location = "กรุณาระบุพิกัดหอพักบนแผนที่";
    }
    
    if (!req.files || req.files.length < 3) {
      errors.images = "กรุณาอัปโหลดรูปภาพอย่างน้อย 3 รูป";
    }
    
    if (req.files && req.files.length > 20) {
      errors.images = "อัปโหลดรูปภาพได้สูงสุด 20 รูป";
    }

    // ถ้ามี error ให้ return
    if (Object.keys(errors).length > 0) {
      await client.query('ROLLBACK');
      console.log('❌ [submitDormitory] Validation errors:', errors);
      return res.status(400).json({
        success: false,
        message: "ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง",
        errors
      });
    }

    // 3. Insert ข้อมูลลง dormitories (status = pending)
    const insertDormQuery = `
      INSERT INTO dormitories (
        dorm_name, address, zone_id,
        contact_name, contact_phone, contact_email, line_id,
        room_type, monthly_price, daily_price, summer_price, deposit,
        electricity_price, water_price_type, water_price,
        latitude, longitude, description,
        approval_status, submitted_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'pending', CURRENT_TIMESTAMP
      ) RETURNING dorm_id
    `;

    const dormValues = [
      dorm_name.trim(),
      address.trim(),
      parseInt(zone_id),
      contact_name || null,
      contact_phone || null,
      contact_email || null,
      line_id || null,
      room_type,
      monthly_price ? parseFloat(monthly_price) : null,
      daily_price ? parseFloat(daily_price) : null,
      summer_price ? parseFloat(summer_price) : null,
      deposit ? parseFloat(deposit) : null,
      electricity_price ? parseFloat(electricity_price) : null,
      water_price_type || null,
      water_price ? parseFloat(water_price) : null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      finalDescription || null
    ];

    const dormResult = await client.query(insertDormQuery, dormValues);
    const dorm_id = dormResult.rows[0].dorm_id;

    console.log('✅ [submitDormitory] Created dorm_id:', dorm_id);

    // 4. Upload รูปภาพไป Supabase Storage
    const uploadedImages = [];
    const primaryIndex = primary_image_index ? parseInt(primary_image_index) : 0;

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      console.log(`📸 [submitDormitory] Uploading image ${i + 1}/${req.files.length}`);
      
      try {
        const imageUrl = await supabaseStorage.uploadImage(file);
        
        uploadedImages.push({
          url: imageUrl,
          is_primary: i === primaryIndex
        });
      } catch (error) {
        console.error(`❌ [submitDormitory] Failed to upload image ${i}:`, error.message);
      }
    }

    console.log(`✅ [submitDormitory] Uploaded ${uploadedImages.length} images`);

    // 5. Insert รูปภาพลง dormitory_images
    for (const img of uploadedImages) {
      const insertImageQuery = `
        INSERT INTO dormitory_images (dorm_id, image_url, is_primary, upload_date)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `;
      await client.query(insertImageQuery, [dorm_id, img.url, img.is_primary]);
    }

    // 6. Insert สิ่งอำนวยความสะดวก
    if (amenities) {
      try {
        let amenitiesArray = [];
        
        // รองรับทั้ง JSON string และ array
        if (typeof amenities === 'string') {
          amenitiesArray = JSON.parse(amenities);
        } else if (Array.isArray(amenities)) {
          amenitiesArray = amenities;
        }
        
        console.log('🏠 [submitDormitory] Processing amenities:', amenitiesArray);
        
        if (Array.isArray(amenitiesArray) && amenitiesArray.length > 0) {
          for (const amenityName of amenitiesArray) {
            // หา amenity_id จาก master table
            const amenityQuery = `
              SELECT amenity_id FROM dormitory_amenities 
              WHERE amenity_name = $1 
              LIMIT 1
            `;
            const amenityResult = await client.query(amenityQuery, [amenityName]);
            
            if (amenityResult.rows.length > 0) {
              const amenity_id = amenityResult.rows[0].amenity_id;
              
              // Insert ลง mapping table
              const insertMappingQuery = `
                INSERT INTO dormitory_amenity_mapping (dorm_id, amenity_id)
                VALUES ($1, $2)
                ON CONFLICT (dorm_id, amenity_id) DO NOTHING
              `;
              await client.query(insertMappingQuery, [dorm_id, amenity_id]);
            } else {
              console.warn(`⚠️ [submitDormitory] Amenity not found: ${amenityName}`);
            }
          }
        }
      } catch (e) {
        console.error("❌ [submitDormitory] Error parsing amenities:", e);
      }
    }

    await client.query('COMMIT');

    console.log('🎉 [submitDormitory] Success! dorm_id:', dorm_id);

    // 7. ส่ง response กลับ
    res.status(201).json({
      success: true,
      message: "ส่งข้อมูลหอพักเรียบร้อยแล้ว รอการตรวจสอบจากทีมงาน",
      dorm_id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ [submitDormitory] Error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการส่งข้อมูล",
      error: error.message
    });
  } finally {
    client.release();
  }
};

// ===== ADMIN MANAGEMENT (ใช้ adminDormitoryController แทน) =====
// ฟังก์ชันเหล่านี้ย้ายไปอยู่ใน adminDormitoryController.js แล้ว
// - getAllDormitories (ดูรายการหอพักทั้งหมด)
// - getPendingDormitories (ดูรายการหอพักที่รอการอนุมัติ)
// - getDormitoryDetailsByAdmin (ดูรายละเอียดหอพัก)
// - updateDormitoryApproval (อนุมัติ/ปฏิเสธหอพัก)
// - deleteDormitory (ลบหอพัก)
