// src/controllers/adminDormitoryController.js
const pool = require("../db");
const logger = require("../logger");
const supabaseStorage = require("../services/supabaseStorageService");
const cleanupOrphanImagesService = require("../services/cleanupOrphanImagesService");
const duplicateCheckService = require("../services/duplicateCheckService");

// ฟังก์ชันสำหรับดูรายการหอพักทั้งหมด (สำหรับผู้ดูแลระบบ)
exports.getAllDormitories = async (req, res) => {
  try {
    const query = `
      SELECT 
        d.dorm_id,
        d.dorm_name,
        d.address,
        d.approval_status,
        d.submitted_date,
        d.monthly_price,
        d.daily_price,
        d.room_type,
        z.zone_name,
        (SELECT image_url FROM dormitory_images WHERE dorm_id = d.dorm_id AND is_primary = true LIMIT 1) as main_image_url
      FROM dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      ORDER BY d.submitted_date DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    logger.error("Error fetching all dormitories:", error);
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลหอพักทั้งหมด" });
  }
};

// ฟังก์ชันสำหรับดูรายการหอพักที่รอการอนุมัติ (สำหรับผู้ดูแลระบบ)
exports.getPendingDormitories = async (req, res) => {
  try {
    const query = `
      SELECT 
        d.dorm_id,
        d.dorm_name,
        d.address,
        d.approval_status,
        d.submitted_date,
        d.monthly_price,
        d.daily_price,
        d.room_type,
        z.zone_name,
        (SELECT image_url FROM dormitory_images WHERE dorm_id = d.dorm_id AND is_primary = true LIMIT 1) as main_image_url
      FROM dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.approval_status = 'pending'
      ORDER BY d.submitted_date DESC
    `;

    logger.debug("getPendingDormitories: executing query", { query });
    const result = await pool.query(query);
    logger.debug("getPendingDormitories: result", { count: result.rows.length });
    
    res.json(result.rows);
  } catch (error) {
    logger.error("Error fetching pending dormitories:", error);
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลหอพักที่รอการอนุมัติ" });
  }
};

// ฟังก์ชันสำหรับดูรายการหอพักที่ปฏิเสธ (สำหรับผู้ดูแลระบบ)
exports.getRejectedDormitories = async (req, res) => {
  try {
    const query = `
      SELECT 
        d.dorm_id,
        d.dorm_name,
        d.address,
        d.approval_status,
        d.submitted_date,
        d.updated_at,
        d.monthly_price,
        d.daily_price,
        d.room_type,
        z.zone_name,
        (SELECT image_url FROM dormitory_images WHERE dorm_id = d.dorm_id AND is_primary = true LIMIT 1) as main_image_url
      FROM dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.approval_status = 'rejected'
      ORDER BY d.updated_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    logger.error("Error fetching rejected dormitories:", error);
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลหอพักที่ปฏิเสธ" });
  }
};

exports.updateDormitoryApproval = async (req, res) => {
  const client = await pool.connect();
  try {
    const { dormId } = req.params;
    const { status } = req.body;
    const firebase_uid = req.user.uid;

    // ตรวจสอบสิทธิ์ผู้ใช้ (เฉพาะผู้ดูแลระบบที่สามารถอนุมัติหรือปฏิเสธได้)
    const userResult = await client.query(
      "SELECT admin_id, is_active FROM admins WHERE firebase_uid = $1",
      [firebase_uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const admin = userResult.rows[0];

    if (!admin.is_active) {
      return res
        .status(403)
        .json({ message: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถดำเนินการนี้ได้" });
    }

    await client.query("BEGIN");

    // 1. Update dormitory approval status
    const dormQuery = `
            UPDATE dormitories
            SET 
                approval_status = $1,
                updated_at = NOW()
            WHERE dorm_id = $2
        `;

    await client.query(dormQuery, [
      status,
      dormId,
    ]);

    await client.query("COMMIT");

    res.json({ message: "สถานะการอนุมัติหอพักถูกปรับปรุงเรียบร้อยแล้ว" });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Error updating dormitory approval:", error);
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการปรับปรุงสถานะการอนุมัติหอพัก" });
  } finally {
    client.release();
  }
};

// เช็คหอที่อาจซ้ำ (เทียบกับหอที่อนุมัติแล้วทั้งหมด) — ไม่แก้ข้อมูล แค่คืนรายการให้แอดมินดู
exports.getCheckDuplicateDormitories = async (req, res) => {
  try {
    const { dormId } = req.params;

    const dormResult = await pool.query(
      "SELECT dorm_id, dorm_name, address, latitude, longitude FROM dormitories WHERE dorm_id = $1",
      [dormId]
    );
    if (dormResult.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลหอพัก" });
    }

    const currentDorm = dormResult.rows[0];
    currentDorm.latitude = currentDorm.latitude != null ? Number(currentDorm.latitude) : null;
    currentDorm.longitude = currentDorm.longitude != null ? Number(currentDorm.longitude) : null;

    const similar = await duplicateCheckService.findSimilarApprovedDormitories(pool, currentDorm);

    res.json({
      dorm_id: currentDorm.dorm_id,
      dorm_name: currentDorm.dorm_name,
      similar_dormitories: similar,
    });
  } catch (error) {
    logger.error("Error checking duplicate dormitories:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเช็คหอที่อาจซ้ำ" });
  }
};

// ฟังก์ชันสำหรับดูรายละเอียดหอพักแต่ละตัว (สำหรับแอดมิน)
exports.getDormitoryDetailsByAdmin = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    // 1. ข้อมูลพื้นฐานหอพัก (ไม่กรอง approval_status เพื่อให้แอดมินดูได้ทุกสถานะ)
    const dormQuery = `
      SELECT 
        d.*,
        z.zone_name
      FROM dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.dorm_id = $1
    `;
    
    const dormResult = await pool.query(dormQuery, [dormId]);
    
    if (dormResult.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลหอพัก" });
    }
    
    const dormitory = dormResult.rows[0];
    
    // 2. รูปภาพหอพัก
    const imagesQuery = `
      SELECT image_id, image_url, is_primary
      FROM dormitory_images 
      WHERE dorm_id = $1 
      ORDER BY is_primary DESC, upload_date DESC
    `;
    const imagesResult = await pool.query(imagesQuery, [dormId]);
    
    // 3. สิ่งอำนวยความสะดวก (ใช้ระบบใหม่ผ่าน mapping table)
    const amenitiesQuery = `
      SELECT 
        da.amenity_id,
        da.amenity_name
      FROM dormitory_amenity_mapping dam
      INNER JOIN dormitory_amenities da ON dam.amenity_id = da.amenity_id
      WHERE dam.dorm_id = $1
      ORDER BY da.amenity_name
    `;
    const amenitiesResult = await pool.query(amenitiesQuery, [dormId]);
    
    // รวมข้อมูลทั้งหมด
    const response = {
      ...dormitory,
      latitude: dormitory.latitude ? Number(dormitory.latitude) : null,
      longitude: dormitory.longitude ? Number(dormitory.longitude) : null,
      images: imagesResult.rows,
      amenities: amenitiesResult.rows,
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error("Error fetching dormitory details for admin:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลรายละเอียดหอพัก" });
  }
};

// ฟังก์ชันสำหรับแก้ไขหอพักโดยแอดมิน
exports.updateDormitoryByAdmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { dormId } = req.params;
    const firebase_uid = req.user.uid;
    const updateData = req.body;
    
    // ตรวจสอบสิทธิ์แอดมิน
    const adminResult = await client.query(
      "SELECT admin_id, is_active FROM admins WHERE firebase_uid = $1",
      [firebase_uid]
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }
    
    const admin = adminResult.rows[0];
    if (!admin.is_active) {
      return res.status(403).json({ message: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถดำเนินการนี้ได้" });
    }
    
    await client.query("BEGIN");

    // ถ้าหอพักเดิมเป็น rejected ให้เปลี่ยนเป็น pending เมื่อบันทึกแก้ไข (ต้องตรวจสอบใหม่)
    const currentDorm = await client.query(
      "SELECT approval_status FROM dormitories WHERE dorm_id = $1",
      [dormId]
    );
    if (currentDorm.rows.length > 0 && currentDorm.rows[0].approval_status === "rejected") {
      await client.query(
        "UPDATE dormitories SET approval_status = 'pending', updated_at = NOW() WHERE dorm_id = $1",
        [dormId]
      );
    }
    
    // สร้าง dynamic query สำหรับการอัปเดต (รับเฉพาะฟิลด์ที่ตรงกับคอลัมน์ในตาราง dormitories)
    const allowedFields = [
      'dorm_name', 'address', 'description', 'latitude', 'longitude',
      'electricity_price_type', 'electricity_price', 'water_price_type', 'water_price',
      'zone_id', 'monthly_price', 'daily_price', 'summer_price', 'deposit', 'room_type'
    ];

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    }
    
    if (updateFields.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "ไม่มีข้อมูลที่ต้องอัปเดต" });
    }
    
    // เพิ่ม updated_at
    updateFields.push(`updated_at = NOW()`);
    
    // เพิ่ม dormId เป็น parameter สุดท้าย
    updateValues.push(dormId);
    
    const updateQuery = `
      UPDATE dormitories 
      SET ${updateFields.join(', ')}
      WHERE dorm_id = $${paramCount}
    `;
    
    await client.query(updateQuery, updateValues);

    // อัปเดต amenities ถ้ามีส่งมา (array ของ amenity_name)
    if (updateData.amenities !== undefined && Array.isArray(updateData.amenities)) {
      // ลบ mapping เดิม
      await client.query(
        `DELETE FROM dormitory_amenity_mapping WHERE dorm_id = $1`,
        [dormId]
      );
      // เพิ่ม mapping ใหม่ (dedupe ชื่อ)
      const uniqueNames = [...new Set(updateData.amenities)];
      for (const amenityName of uniqueNames) {
        if (!amenityName || typeof amenityName !== "string") continue;
        const amenityResult = await client.query(
          `SELECT amenity_id FROM dormitory_amenities WHERE amenity_name = $1 LIMIT 1`,
          [amenityName.trim()]
        );
        if (amenityResult.rows.length > 0) {
          await client.query(
            `INSERT INTO dormitory_amenity_mapping (dorm_id, amenity_id)
             VALUES ($1, $2)`,
            [dormId, amenityResult.rows[0].amenity_id]
          );
        }
      }
    }

    // อัปเดตรูปภาพ (images = array ของ image_url ที่ควรเหลืออยู่ทั้งหมด)
    if (updateData.images !== undefined && Array.isArray(updateData.images)) {
      const currentImages = await client.query(
        `SELECT image_url FROM dormitory_images WHERE dorm_id = $1`,
        [dormId]
      );
      const urlsToKeep = new Set(
        updateData.images.map((u) => (typeof u === "string" ? u.trim() : "")).filter(Boolean)
      );
      // ลบรูปที่ user เอาออก (ลบจาก storage ด้วย)
      for (const row of currentImages.rows) {
        if (!urlsToKeep.has(row.image_url)) {
          try {
            await supabaseStorage.deleteImage(row.image_url);
          } catch (err) {
            logger.warn("⚠️ Failed to delete image from storage:", row.image_url, err.message);
          }
        }
      }
      // ลบแถวเดิมทั้งหมดของหอนี้
      await client.query(`DELETE FROM dormitory_images WHERE dorm_id = $1`, [dormId]);
      // เพิ่มแถวใหม่ตามรายการที่ส่งมา (รูปแรก = is_primary)
      const primaryIndex = updateData.primary_image_index != null
        ? parseInt(updateData.primary_image_index, 10)
        : 0;
      const imageUrls = updateData.images.filter((u) => typeof u === "string" && u.trim());
      for (let i = 0; i < imageUrls.length; i++) {
        await client.query(
          `INSERT INTO dormitory_images (dorm_id, image_url, is_primary, upload_date)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
          [dormId, imageUrls[i].trim(), i === primaryIndex]
        );
      }
    }
    
    await client.query("COMMIT");
    
    res.json({ message: "อัปเดตข้อมูลหอพักเรียบร้อยแล้ว" });
    
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Error updating dormitory by admin:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลหอพัก" });
  } finally {
    client.release();
  }
};

// ฟังก์ชันสำหรับลบหอพัก (เฉพาะผู้ดูแลระบบ)
exports.deleteDormitory = async (req, res) => {
  const client = await pool.connect();
  try {
    const { dormId } = req.params;
    const firebase_uid = req.user.uid;

    // ตรวจสอบสิทธิ์ผู้ใช้ (เฉพาะผู้ดูแลระบบที่สามารถลบได้)
    const adminResult = await client.query(
      "SELECT admin_id, is_active FROM admins WHERE firebase_uid = $1",
      [firebase_uid]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const admin = adminResult.rows[0];

    if (!admin.is_active) {
      return res
        .status(403)
        .json({ message: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบหอพักได้" });
    }

    await client.query("BEGIN");

    // ตรวจสอบว่าหอพักมีอยู่หรือไม่และดึงชื่อหอพัก
    const dormCheckResult = await client.query(
      "SELECT dorm_id, dorm_name FROM dormitories WHERE dorm_id = $1",
      [dormId]
    );

    if (dormCheckResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "ไม่พบข้อมูลหอพัก" });
    }

    const dormName = dormCheckResult.rows[0].dorm_name;

    // ดึง image_url ทั้งหมดของหอพักเพื่อลบจาก storage
    const imagesResult = await client.query(
      `SELECT image_url FROM dormitory_images WHERE dorm_id = $1`,
      [dormId]
    );

    // ลบรูปภาพจาก Supabase Storage
    if (imagesResult.rows.length > 0) {
      logger.debug("deleteDormitory: deleting images from storage", { count: imagesResult.rows.length });
      for (const row of imagesResult.rows) {
        try {
          await supabaseStorage.deleteImage(row.image_url);
        } catch (error) {
          logger.error(`⚠️ [deleteDormitory] Failed to delete image from storage:`, row.image_url, error.message);
          // ไม่ throw error เพื่อให้ลบข้อมูลจาก DB ต่อได้
        }
      }
    }

    // ลบข้อมูล amenity mapping
    await client.query(`DELETE FROM dormitory_amenity_mapping WHERE dorm_id = $1`, [dormId]);

    // ลบข้อมูลรูปภาพหอพักจาก DB
    await client.query(`DELETE FROM dormitory_images WHERE dorm_id = $1`, [dormId]);

    // ลบข้อมูลหอพัก
    await client.query(`DELETE FROM dormitories WHERE dorm_id = $1`, [dormId]);

    await client.query("COMMIT");

    res.json({ 
      message: `ลบหอพัก "${dormName}" เรียบร้อยแล้ว`,
      dorm_name: dormName
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Error deleting dormitory:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบหอพัก" });
  } finally {
    client.release();
  }
};

// ฟังก์ชันสำหรับเปรียบเทียบหอพักหลายตัว (สำหรับผู้ดูแลระบบ)
exports.compareDormitories = async (req, res) => {
  try {
    const { dormIds } = req.query; // รับเป็น query string เช่น ?dormIds=1,2,3

    if (!dormIds) {
      return res.status(400).json({ message: "กรุณาระบุ dormIds" });
    }

    // แปลง string เป็น array of integers
    const idsArray = dormIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (idsArray.length === 0) {
      return res.status(400).json({ message: "dormIds ไม่ถูกต้อง" });
    }

    // Query ข้อมูลหอพักทั้งหมดที่ต้องการเปรียบเทียบ
    const dormQuery = `
      SELECT
        d.dorm_id,
        d.dorm_name,
        d.address,
        d.description,
        d.latitude,
        d.longitude,
        d.zone_id,
        z.zone_name,
        d.approval_status,
        d.submitted_date,
        d.monthly_price,
        d.daily_price,
        d.summer_price,
        d.deposit,
        d.room_type,
        d.room_type_other,
        d.electricity_price,
        d.water_price_type,
        d.water_price,
        d.contact_name,
        d.contact_phone,
        d.contact_email,
        d.line_id,
        (SELECT image_url FROM dormitory_images WHERE dorm_id = d.dorm_id AND is_primary = true LIMIT 1) as main_image_url
      FROM dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.dorm_id = ANY($1)
      ORDER BY d.dorm_id
    `;

    const dormResult = await pool.query(dormQuery, [idsArray]);

    if (dormResult.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลหอพักที่ระบุ" });
    }

    // Query amenities สำหรับแต่ละหอ
    const amenitiesQuery = `
      SELECT
        dam.dorm_id,
        da.amenity_id,
        da.amenity_name
      FROM dormitory_amenity_mapping dam
      INNER JOIN dormitory_amenities da ON dam.amenity_id = da.amenity_id
      WHERE dam.dorm_id = ANY($1)
      ORDER BY dam.dorm_id, da.amenity_name
    `;

    const amenitiesResult = await pool.query(amenitiesQuery, [idsArray]);

    // จัดกลุ่ม amenities ตาม dorm_id
    const amenitiesByDorm = {};
    amenitiesResult.rows.forEach(row => {
      if (!amenitiesByDorm[row.dorm_id]) {
        amenitiesByDorm[row.dorm_id] = [];
      }
      amenitiesByDorm[row.dorm_id].push({
        amenity_id: row.amenity_id,
        amenity_name: row.amenity_name
      });
    });

    // รวมข้อมูลทั้งหมด
    const response = dormResult.rows.map(dorm => ({
      ...dorm,
      latitude: dorm.latitude ? Number(dorm.latitude) : null,
      longitude: dorm.longitude ? Number(dorm.longitude) : null,
      amenities: amenitiesByDorm[dorm.dorm_id] || []
    }));

    res.json(response);

  } catch (error) {
    logger.error("Error comparing dormitories:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเปรียบเทียบหอพัก" });
  }
};

// ลบรูปกำพร้า (orphan images) ที่ไม่ถูกชี้โดย dormitory_images
exports.cleanupOrphanImages = async (req, res) => {
  try {
    const dryRun = req.query.dry_run === "true";
    const maxDraftAgeHours = parseInt(req.query.max_draft_age_hours, 10) || 24;

    const stats = await cleanupOrphanImagesService.cleanupOrphanImages({
      maxDraftAgeHours,
      dryRun,
    });

    res.json({
      success: true,
      message: dryRun ? "Dry run - ไม่มีการลบจริง" : "ลบรูปกำพร้าเรียบร้อยแล้ว",
      stats,
    });
  } catch (error) {
    logger.error("Error cleaning up orphan images:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการลบรูปกำพร้า",
      error: error.message,
    });
  }
};

// ลบรูปภาพหอพักทีละรูป (เฉพาะผู้ดูแลระบบ)
exports.deleteDormitoryImageByAdmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { dormId, imageId } = req.params;
    const firebase_uid = req.user.uid;

    // ตรวจสอบสิทธิ์แอดมิน
    const adminResult = await client.query(
      "SELECT admin_id, is_active FROM admins WHERE firebase_uid = $1",
      [firebase_uid]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const admin = adminResult.rows[0];
    if (!admin.is_active) {
      return res.status(403).json({ message: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบรูปภาพได้" });
    }

    await client.query("BEGIN");

    // ดึงข้อมูลรูปภาพเพื่อเอา URL ไปลบจาก Storage
    const imageQuery = `
      SELECT image_url, is_primary 
      FROM dormitory_images 
      WHERE image_id = $1 AND dorm_id = $2
    `;
    const imageResult = await client.query(imageQuery, [imageId, dormId]);

    if (imageResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "ไม่พบข้อมูลรูปภาพ" });
    }

    const { image_url, is_primary } = imageResult.rows[0];

    // ลบจาก Database
    await client.query(
      "DELETE FROM dormitory_images WHERE image_id = $1 AND dorm_id = $2",
      [imageId, dormId]
    );

    // ลบจาก Storage
    try {
      await supabaseStorage.deleteImage(image_url);
    } catch (storageError) {
      logger.warn("⚠️ Failed to delete image from storage:", image_url, storageError.message);
      // ยังดำเนินงานต่อเพื่อให้ DB สอดคล้อง
    }

    // ถ้าลบรูปที่เป็น primary ไป ให้หารูปใหม่มาเป็น primary (ถ้ามี)
    if (is_primary) {
      const nextImageResult = await client.query(
        "SELECT image_id FROM dormitory_images WHERE dorm_id = $1 ORDER BY upload_date ASC LIMIT 1",
        [dormId]
      );
      if (nextImageResult.rows.length > 0) {
        await client.query(
          "UPDATE dormitory_images SET is_primary = true WHERE image_id = $1",
          [nextImageResult.rows[0].image_id]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "ลบรูปภาพเรียบร้อยแล้ว", image_id: imageId });

  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Error deleting dormitory image:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบรูปภาพ" });
  } finally {
    client.release();
  }
};

// เพิ่มรูปภาพหอพัก (เฉพาะผู้ดูแลระบบ)
exports.addDormitoryImageByAdmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { dormId } = req.params;
    const { image_url, is_primary } = req.body;
    const firebase_uid = req.user.uid;

    if (!image_url) {
      return res.status(400).json({ message: "กรุณาระบุ URL ของรูปภาพ" });
    }

    // ตรวจสอบสิทธิ์แอดมิน
    const adminResult = await client.query(
      "SELECT admin_id, is_active FROM admins WHERE firebase_uid = $1",
      [firebase_uid]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const admin = adminResult.rows[0];
    if (!admin.is_active) {
      return res.status(403).json({ message: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเพิ่มรูปภาพได้" });
    }

    await client.query("BEGIN");

    // ถ้าตั้งรูปใหม่เป็น primary ให้เอา flag ออกจากรูปเก่า
    if (is_primary === true || is_primary === 1) {
      await client.query(
        "UPDATE dormitory_images SET is_primary = false WHERE dorm_id = $1",
        [dormId]
      );
    }

    // ย้ายรูปจาก drafts ไปยัง dormitory folder (ถ้าเป็นรูปใหม่)
    let finalImageUrl = image_url;
    try {
        finalImageUrl = await supabaseStorage.moveImageToDormitoryFolder(image_url, dormId);
    } catch (moveError) {
        logger.warn("⚠️ Failed to move image to dormitory folder:", moveError.message);
        // ใช้ URL เดิมถ้าเดี๋ยวย้ายไม่ได้
    }

    const insertQuery = `
      INSERT INTO dormitory_images (dorm_id, image_url, is_primary, upload_date)
      VALUES ($1, $2, $3, NOW())
      RETURNING image_id
    `;
    const insertResult = await client.query(insertQuery, [dormId, finalImageUrl, is_primary || false]);

    await client.query("COMMIT");
    res.status(201).json({ 
      message: "เพิ่มรูปภาพเรียบร้อยแล้ว", 
      image_id: insertResult.rows[0].image_id,
      image_url: finalImageUrl 
    });

  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Error adding dormitory image:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มรูปภาพ" });
  } finally {
    client.release();
  }
};
