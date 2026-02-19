// src/controllers/submissionController.js
// ระบบใหม่: ส่งข้อมูลตรงเข้า dormitories table (status = pending)

const pool = require("../db");
const supabaseStorage = require("../services/supabaseStorageService");

// ===== PUBLIC FORM SUBMISSION =====

// รับข้อมูลจากฟอร์มหน้าบ้าน (รับ JSON แทน FormData)
exports.submitDormitory = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. ดึงข้อมูลจาก JSON body (Frontend ส่ง JSON มาแล้ว)
    const {
      // Step 1: Basic Info
      accommodation_type, // field ใหม่จาก Frontend
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
      term_price, // field ใหม่จาก Frontend (อาจจะ map ไป summer_price)
      summer_price,
      deposit,
      
      // Step 4: Utilities
      electricity_price_type, // field ใหม่จาก Frontend
      electricity_price,
      water_price_type,
      water_price,
      
      // Step 5: Location & Additional
      latitude,
      longitude,
      amenities, // array ของ amenity names
      dorm_description,
      description, // รองรับทั้ง description และ dorm_description
      images, // array ของ image paths/URLs จาก Frontend (อัปโหลดไป dorm-drafts/ แล้ว)
      primary_image_index
    } = req.body;

    // ใช้ dorm_description หรือ description (รองรับทั้ง 2 แบบ)
    const finalDescription = dorm_description || description;
    
    // ใช้ term_price ถ้ามี หรือใช้ summer_price
    const finalSummerPrice = term_price || summer_price;

    console.log('📝 [submitDormitory] Received JSON data:', {
      accommodation_type,
      dorm_name,
      address,
      zone_id,
      room_type,
      monthly_price,
      daily_price,
      term_price,
      summer_price: finalSummerPrice,
      deposit,
      electricity_price_type,
      electricity_price,
      water_price_type,
      water_price,
      latitude,
      longitude,
      amenities: typeof amenities,
      images_count: images?.length,
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
    
    // ตรวจสอบ images array จาก JSON (Frontend ส่งมาเป็น array ของ paths/URLs)
    if (!images || !Array.isArray(images) || images.length < 3) {
      errors.images = "กรุณาอัปโหลดรูปภาพอย่างน้อย 3 รูป";
    }
    
    if (images && images.length > 20) {
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
      finalSummerPrice ? parseFloat(finalSummerPrice) : null,
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

    // 4. ย้ายรูปภาพจาก dorm-drafts/ ไป {dormId}/ folder
    // Frontend อัปโหลดรูปไป dorm-drafts/ ก่อน แล้ว Backend จะย้ายไป {dormId}/ หลังจากสร้าง dormitory
    const movedImages = [];
    const primaryIndex = primary_image_index ? parseInt(primary_image_index) : 0;

    for (let i = 0; i < images.length; i++) {
      const imagePath = images[i]; // path หรือ URL จาก Frontend
      console.log(`📸 [submitDormitory] Moving image ${i + 1}/${images.length} from dorm-drafts/ to dormitory ${dorm_id}`);
      
      try {
        // ย้ายรูปจาก dorm-drafts/ ไป {dormId}/
        const imageUrl = await supabaseStorage.moveImageToDormitoryFolder(imagePath, dorm_id);
        
        movedImages.push({
          url: imageUrl,
          is_primary: i === primaryIndex
        });
      } catch (error) {
        console.error(`❌ [submitDormitory] Failed to move image ${i}:`, error.message);
        // ถ้าย้ายไม่ได้ ให้ใช้ URL เดิม (อาจจะอยู่ใน folder อื่นแล้ว)
        movedImages.push({
          url: imagePath, // ใช้ path เดิม
          is_primary: i === primaryIndex
        });
      }
    }

    console.log(`✅ [submitDormitory] Moved ${movedImages.length} images to dormitory ${dorm_id} folder`);

    // 5. Insert รูปภาพลง dormitory_images
    for (const img of movedImages) {
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
