// src/controllers/submissionController.js
// Phase 1: Form Submission API
// Phase 2: Admin Management API

const pool = require("../db");
const supabaseStorage = require("../services/supabaseStorageService");

// ===== PHASE 1: PUBLIC FORM SUBMISSION =====

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
      zone_name,
      
      // Step 2: Contact Info (optional)
      contact_name,
      contact_phone,
      contact_email,
      line_id,
      
      // Step 3: Room Type & Pricing
      room_type,
      room_type_other,
      monthly_price,
      daily_price,
      summer_price,
      deposit,
      
      // Step 4: Location & Additional
      latitude,
      longitude,
      amenities, // JSON string
      description,
      primary_image_index
    } = req.body;

    // 2. Validate required fields
    const errors = {};
    
    if (!dorm_name || dorm_name.trim().length < 3) {
      errors.dorm_name = "ชื่อหอพักต้องมีอย่างน้อย 3 ตัวอักษร";
    }
    
    if (!address || address.trim().length < 10) {
      errors.address = "ที่อยู่ต้องมีอย่างน้อย 10 ตัวอักษร";
    }
    
    if (!zone_name) {
      errors.zone_name = "กรุณาเลือกโซน";
    }
    
    if (!room_type) {
      errors.room_type = "กรุณาเลือกประเภทห้อง";
    }
    
    if (room_type === "อื่นๆ" && !room_type_other) {
      errors.room_type_other = "กรุณาระบุประเภทห้องอื่นๆ";
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
    
    if (primary_image_index === undefined || primary_image_index === null) {
      errors.primary_image = "กรุณาเลือกรูปหลัก";
    }

    // ถ้ามี error ให้ return
    if (Object.keys(errors).length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: "ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง",
        errors
      });
    }

    // 3. Insert ข้อมูลลง raw_submissions
    const insertSubmissionQuery = `
      INSERT INTO raw_submissions (
        dorm_name, address, zone_name,
        contact_name, contact_phone, contact_email, line_id,
        room_type, room_type_other,
        monthly_price, daily_price, summer_price, deposit,
        latitude, longitude, description,
        status, submitted_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending', CURRENT_TIMESTAMP
      ) RETURNING submission_id
    `;

    const submissionValues = [
      dorm_name.trim(),
      address.trim(),
      zone_name,
      contact_name || null,
      contact_phone || null,
      contact_email || null,
      line_id || null,
      room_type,
      room_type === "อื่นๆ" ? room_type_other : null,
      monthly_price ? parseFloat(monthly_price) : null,
      daily_price ? parseFloat(daily_price) : null,
      summer_price ? parseFloat(summer_price) : null,
      deposit ? parseFloat(deposit) : null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      description || null
    ];

    const submissionResult = await client.query(insertSubmissionQuery, submissionValues);
    const submission_id = submissionResult.rows[0].submission_id;

    // 4. Upload รูปภาพไป Supabase Storage
    const uploadedImages = [];
    const primaryIndex = parseInt(primary_image_index);

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const uploadResult = await supabaseStorage.uploadImage(file);
      
      if (uploadResult.success) {
        uploadedImages.push({
          url: uploadResult.url,
          is_primary: i === primaryIndex,
          display_order: i
        });
      }
    }

    // 5. Insert รูปภาพลง submission_images
    for (const img of uploadedImages) {
      const insertImageQuery = `
        INSERT INTO submission_images (submission_id, image_url, is_primary, display_order)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(insertImageQuery, [submission_id, img.url, img.is_primary, img.display_order]);
    }

    // 6. Insert สิ่งอำนวยความสะดวกลง submission_amenities
    if (amenities) {
      try {
        const amenitiesArray = JSON.parse(amenities);
        if (Array.isArray(amenitiesArray) && amenitiesArray.length > 0) {
          for (const amenity of amenitiesArray) {
            const insertAmenityQuery = `
              INSERT INTO submission_amenities (submission_id, amenity_name)
              VALUES ($1, $2)
            `;
            await client.query(insertAmenityQuery, [submission_id, amenity]);
          }
        }
      } catch (e) {
        console.error("Error parsing amenities:", e);
      }
    }

    await client.query('COMMIT');

    // 7. ส่ง response กลับ
    res.status(201).json({
      success: true,
      message: "ส่งข้อมูลหอพักเรียบร้อยแล้ว รอการตรวจสอบจากทีมงาน",
      submission_id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error submitting dormitory:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการส่งข้อมูล",
      error: error.message
    });
  } finally {
    client.release();
  }
};

// ===== PHASE 2: ADMIN MANAGEMENT =====

// ดึงรายการ submissions ทั้งหมด (สำหรับแอดมิน)
exports.getAllSubmissions = async (req, res) => {
  try {
    const { status } = req.query; // pending, approved, rejected

    let query = `
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM submission_images WHERE submission_id = s.submission_id) as image_count,
        (SELECT COUNT(*) FROM submission_amenities WHERE submission_id = s.submission_id) as amenity_count,
        (SELECT image_url FROM submission_images WHERE submission_id = s.submission_id AND is_primary = true LIMIT 1) as primary_image,
        a.username as processed_by_username
      FROM raw_submissions s
      LEFT JOIN admins a ON s.processed_by = a.admin_id
    `;

    const values = [];
    
    if (status) {
      query += ` WHERE s.status = $1`;
      values.push(status);
    }

    query += ` ORDER BY s.submitted_date DESC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล", error: error.message });
  }
};

// ดึงข้อมูล submission ตาม ID (พร้อมรูปภาพและสิ่งอำนวยความสะดวก)
exports.getSubmissionById = async (req, res) => {
  try {
    const { submissionId } = req.params;

    // 1. ดึงข้อมูลหลัก
    const submissionQuery = `
      SELECT s.*, a.username as processed_by_username
      FROM raw_submissions s
      LEFT JOIN admins a ON s.processed_by = a.admin_id
      WHERE s.submission_id = $1
    `;
    const submissionResult = await pool.query(submissionQuery, [submissionId]);

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    const submission = submissionResult.rows[0];

    // 2. ดึงรูปภาพ
    const imagesQuery = `
      SELECT * FROM submission_images
      WHERE submission_id = $1
      ORDER BY display_order
    `;
    const imagesResult = await pool.query(imagesQuery, [submissionId]);

    // 3. ดึงสิ่งอำนวยความสะดวก
    const amenitiesQuery = `
      SELECT amenity_name FROM submission_amenities
      WHERE submission_id = $1
    `;
    const amenitiesResult = await pool.query(amenitiesQuery, [submissionId]);

    res.json({
      ...submission,
      images: imagesResult.rows,
      amenities: amenitiesResult.rows.map(row => row.amenity_name)
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูล", error: error.message });
  }
};

// อนุมัติ submission (ย้ายไป approved_dormitories)
exports.approveSubmission = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { submissionId } = req.params;
    const adminId = req.user.admin_id; // จาก authMiddleware

    // 1. ดึงข้อมูล submission
    const submissionQuery = `SELECT * FROM raw_submissions WHERE submission_id = $1`;
    const submissionResult = await client.query(submissionQuery, [submissionId]);

    if (submissionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    const submission = submissionResult.rows[0];

    // 2. หา zone_id จาก zone_name
    const zoneQuery = `SELECT zone_id FROM zones WHERE zone_name = $1`;
    const zoneResult = await client.query(zoneQuery, [submission.zone_name]);
    const zone_id = zoneResult.rows.length > 0 ? zoneResult.rows[0].zone_id : null;

    // 3. คำนวณราคา min/max
    const prices = [submission.monthly_price, submission.daily_price].filter(p => p !== null);
    const min_price = prices.length > 0 ? Math.min(...prices) : null;
    const max_price = prices.length > 0 ? Math.max(...prices) : null;

    // 4. Insert ลง approved_dormitories
    const insertDormQuery = `
      INSERT INTO approved_dormitories (
        source_submission_id, dorm_name, address, description,
        owner_name, owner_phone, owner_email, owner_line_id,
        min_price, max_price, price_display,
        zone_id, latitude, longitude,
        status, approved_by, approved_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15, CURRENT_TIMESTAMP
      ) RETURNING dorm_id
    `;

    const price_display = submission.monthly_price 
      ? `${submission.monthly_price.toLocaleString()} บาท/เดือน`
      : `${submission.daily_price.toLocaleString()} บาท/วัน`;

    const dormValues = [
      submissionId,
      submission.dorm_name,
      submission.address,
      submission.description,
      submission.contact_name,
      submission.contact_phone,
      submission.contact_email,
      submission.line_id,
      min_price,
      max_price,
      price_display,
      zone_id,
      submission.latitude,
      submission.longitude,
      adminId
    ];

    const dormResult = await client.query(insertDormQuery, dormValues);
    const dorm_id = dormResult.rows[0].dorm_id;

    // 5. คัดลอกรูปภาพไป dormitory_images
    const imagesQuery = `SELECT * FROM submission_images WHERE submission_id = $1`;
    const imagesResult = await client.query(imagesQuery, [submissionId]);

    for (const img of imagesResult.rows) {
      const insertImageQuery = `
        INSERT INTO dormitory_images (dorm_id, image_url, is_primary)
        VALUES ($1, $2, $3)
      `;
      await client.query(insertImageQuery, [dorm_id, img.image_url, img.is_primary]);
    }

    // 6. คัดลอกสิ่งอำนวยความสะดวกไป dormitory_amenities
    const amenitiesQuery = `SELECT * FROM submission_amenities WHERE submission_id = $1`;
    const amenitiesResult = await client.query(amenitiesQuery, [submissionId]);

    for (const amenity of amenitiesResult.rows) {
      const insertAmenityQuery = `
        INSERT INTO dormitory_amenities (dorm_id, amenity_name, is_available)
        VALUES ($1, $2, true)
      `;
      await client.query(insertAmenityQuery, [dorm_id, amenity.amenity_name]);
    }

    // 7. อัพเดทสถานะ submission เป็น approved
    const updateSubmissionQuery = `
      UPDATE raw_submissions
      SET status = 'approved', processed_by = $1, processed_date = CURRENT_TIMESTAMP
      WHERE submission_id = $2
    `;
    await client.query(updateSubmissionQuery, [adminId, submissionId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: "อนุมัติข้อมูลหอพักเรียบร้อยแล้ว",
      dorm_id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error approving submission:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการอนุมัติข้อมูล",
      error: error.message
    });
  } finally {
    client.release();
  }
};

// ปฏิเสธ submission
exports.rejectSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { rejection_reason } = req.body;
    const adminId = req.user.admin_id;

    if (!rejection_reason) {
      return res.status(400).json({ message: "กรุณาระบุเหตุผลในการปฏิเสธ" });
    }

    const query = `
      UPDATE raw_submissions
      SET status = 'rejected', 
          rejection_reason = $1,
          processed_by = $2,
          processed_date = CURRENT_TIMESTAMP
      WHERE submission_id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [rejection_reason, adminId, submissionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    res.json({
      success: true,
      message: "ปฏิเสธข้อมูลหอพักเรียบร้อยแล้ว",
      submission: result.rows[0]
    });
  } catch (error) {
    console.error("Error rejecting submission:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการปฏิเสธข้อมูล",
      error: error.message
    });
  }
};

// แก้ไข submission (ก่อนอนุมัติ)
exports.updateSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const {
      dorm_name,
      address,
      zone_name,
      contact_name,
      contact_phone,
      contact_email,
      line_id,
      room_type,
      room_type_other,
      monthly_price,
      daily_price,
      summer_price,
      deposit,
      latitude,
      longitude,
      description
    } = req.body;

    const query = `
      UPDATE raw_submissions
      SET 
        dorm_name = COALESCE($1, dorm_name),
        address = COALESCE($2, address),
        zone_name = COALESCE($3, zone_name),
        contact_name = COALESCE($4, contact_name),
        contact_phone = COALESCE($5, contact_phone),
        contact_email = COALESCE($6, contact_email),
        line_id = COALESCE($7, line_id),
        room_type = COALESCE($8, room_type),
        room_type_other = COALESCE($9, room_type_other),
        monthly_price = COALESCE($10, monthly_price),
        daily_price = COALESCE($11, daily_price),
        summer_price = COALESCE($12, summer_price),
        deposit = COALESCE($13, deposit),
        latitude = COALESCE($14, latitude),
        longitude = COALESCE($15, longitude),
        description = COALESCE($16, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE submission_id = $17
      RETURNING *
    `;

    const values = [
      dorm_name, address, zone_name,
      contact_name, contact_phone, contact_email, line_id,
      room_type, room_type_other,
      monthly_price ? parseFloat(monthly_price) : null,
      daily_price ? parseFloat(daily_price) : null,
      summer_price ? parseFloat(summer_price) : null,
      deposit ? parseFloat(deposit) : null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      description,
      submissionId
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    res.json({
      success: true,
      message: "แก้ไขข้อมูลเรียบร้อยแล้ว",
      submission: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating submission:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล",
      error: error.message
    });
  }
};

// ลบ submission (สำหรับแอดมิน)
exports.deleteSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    // CASCADE จะลบ images และ amenities อัตโนมัติ
    const query = `DELETE FROM raw_submissions WHERE submission_id = $1 RETURNING *`;
    const result = await pool.query(query, [submissionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูล" });
    }

    res.json({
      success: true,
      message: "ลบข้อมูลเรียบร้อยแล้ว"
    });
  } catch (error) {
    console.error("Error deleting submission:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการลบข้อมูล",
      error: error.message
    });
  }
};
