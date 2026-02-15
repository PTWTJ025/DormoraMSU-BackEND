// ===== ปรับปรุงสำหรับระบบใหม่ =====
// ใช้ตาราง approved_dormitories แทน dormitories เก่า
// ระบบใหม่ไม่มี owner functions, เฉพาะ public API

const pool = require("../db");

// ===== Public API Functions (ยังใช้ได้) =====

// ค้นหาชื่อหอพักแบบบางส่วน (สำหรับ autocomplete/instant search)
exports.searchDormNames = async (req, res) => {
  try {
    const rawQuery = (req.query.q || "").toString().trim();
    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 50)
      : 10;

    if (rawQuery.length === 0) {
      return res.json([]);
    }

    const sql = `
      SELECT dorm_id, dorm_name
      FROM approved_dormitories
      WHERE status = 'active'
        AND dorm_name ILIKE $1
      ORDER BY dorm_name
      LIMIT $2
    `;

    const values = [
      `%${rawQuery}%`,
      limit
    ];

    const result = await pool.query(sql, values);

    const items = result.rows.map(r => ({
      id: r.dorm_id,
      name: r.dorm_name
    }));

    res.json(items);
  } catch (error) {
    console.error('Error searching dorm names:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการค้นหาชื่อหอพัก', error: error.message });
  }
};

// ดึงรายการโซนทั้งหมด
exports.getAllZones = async (req, res) => {
  try {
    const query = "SELECT zone_id, zone_name FROM zones WHERE is_active = true ORDER BY zone_name";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching zones:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ดึงรายการสิ่งอำนวยความสะดวกทั้งหมด (ไม่ซ้ำกัน)
exports.getAllAmenities = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT amenity_name
      FROM dormitory_amenities
      ORDER BY amenity_name
    `;
    const result = await pool.query(query);
    
    // ส่งกลับเป็น array ของชื่อสิ่งอำนวยความสะดวก
    const amenities = result.rows.map(row => row.amenity_name);
    
    res.json(amenities);
  } catch (error) {
    console.error("Error fetching amenities:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ดึงข้อมูลหอพักตาม ID
exports.getDormitoryById = async (req, res) => {
  try {
    const { dormId } = req.params;

    // 1. ดึงข้อมูลพื้นฐานของหอพัก
    const dormQuery = `
      SELECT 
        d.*,
        z.zone_name
      FROM approved_dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.dorm_id = $1 AND d.status = 'active'
    `;

    const dormResult = await pool.query(dormQuery, [dormId]);

    if (dormResult.rows.length === 0) {
      return res.status(404).json({ message: "Dormitory not found" });
    }

    const dormitory = dormResult.rows[0];

    // 2. ดึงรูปภาพทั้งหมดของหอพัก
    const imagesQuery = `
      SELECT image_id, image_url, is_primary
      FROM dormitory_images
      WHERE dorm_id = $1
      ORDER BY is_primary DESC, upload_date DESC
    `;
    const imagesResult = await pool.query(imagesQuery, [dormId]);

    // 3. ดึงสิ่งอำนวยความสะดวกของหอพัก
    const amenitiesQuery = `
      SELECT 
        amenity_id,
        amenity_name,
        is_available
      FROM dormitory_amenities
      WHERE dorm_id = $1 AND is_available = true
    `;
    const amenitiesResult = await pool.query(amenitiesQuery, [dormId]);

    // 4. รีวิว (ยังไม่มีในระบบใหม่)
    const reviews = [];

    // 5. คะแนนเฉลี่ย (ยังไม่มีในระบบใหม่)
    const rating_summary = {
      review_count: 0,
      average_rating: 0
    };

    // รวมข้อมูลทั้งหมด
    const response = {
      ...dormitory,
      latitude: dormitory.latitude ? Number(dormitory.latitude) : null,
      longitude: dormitory.longitude ? Number(dormitory.longitude) : null,
      images: imagesResult.rows,
      amenities: amenitiesResult.rows,
      reviews: reviews,
      rating_summary: rating_summary,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching dormitory details:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ดึงหอพักแนะนำ (เรียงตามคะแนนรีวิวและราคา)
exports.getRecommendedDormitories = async (req, res) => {
  try {
    const { limit } = req.query;
    let query = `
      SELECT 
        d.*, 
        z.zone_name, 
        (
          SELECT image_url FROM dormitory_images
          WHERE dorm_id = d.dorm_id
          ORDER BY is_primary DESC, upload_date DESC, image_id ASC
          LIMIT 1
        ) AS main_image_url,
        0 AS avg_rating,
        0 AS review_count,
        -- คำนวณ recommendation score แบบง่าย
        (
          CASE 
            WHEN d.min_price IS NOT NULL AND d.min_price > 0 
            THEN GREATEST(0, (10000 - d.min_price) / 1000) * 0.5
            ELSE 0 
          END +
          COALESCE((SELECT COUNT(*) FROM dormitory_amenities WHERE dorm_id = d.dorm_id AND is_available = true), 0) * 0.3 +
          COALESCE((SELECT COUNT(*) FROM dormitory_images WHERE dorm_id = d.dorm_id), 0) * 0.2
        ) AS recommendation_score,
        (SELECT COUNT(*) FROM dormitory_amenities WHERE dorm_id = d.dorm_id AND is_available = true) AS amenities_count,
        (SELECT COUNT(*) FROM dormitory_images WHERE dorm_id = d.dorm_id) AS images_count
      FROM approved_dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.status = 'active'
      ORDER BY 
        recommendation_score DESC,
        amenities_count DESC,
        images_count DESC,
        d.created_at DESC`;
    const values = [];
    if (limit) {
      values.push(parseInt(limit, 10));
      query += ` LIMIT $1`;
    }
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching recommended dormitories:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ดึงหอพักที่อัพเดทล่าสุด
exports.getLatestDormitories = async (req, res) => {
  try {
    const { limit } = req.query;
    let query = `
      SELECT 
        d.*, 
        z.zone_name, 
        (
          SELECT image_url FROM dormitory_images
          WHERE dorm_id = d.dorm_id
          ORDER BY is_primary DESC, upload_date DESC, image_id ASC
          LIMIT 1
        ) AS main_image_url,
        0 AS avg_rating,
        0 AS review_count
      FROM approved_dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.status = 'active'
      ORDER BY d.updated_at DESC NULLS LAST`;
    const values = [];
    if (limit) {
      values.push(parseInt(limit, 10));
      query += ` LIMIT $1`;
    }
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching latest dormitories:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ดึงหอพักทั้งหมดที่อนุมัติแล้ว (สำหรับ public)
exports.getAllApprovedDormitories = async (req, res) => {
  try {
    const query = `
      SELECT 
        d.*, 
        z.zone_name, 
        (
          SELECT image_url FROM dormitory_images
          WHERE dorm_id = d.dorm_id
          ORDER BY is_primary DESC, upload_date DESC, image_id ASC
          LIMIT 1
        ) AS main_image_url,
        0 AS avg_rating,
        0 AS review_count
      FROM approved_dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.status = 'active'
      ORDER BY d.created_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all approved dormitories:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลหอพักทั้งหมด" });
  }
};

// ดึงรูปทั้งหมดของหอพักตาม dorm_id
exports.getDormitoryImages = async (req, res) => {
  try {
    const { dormId } = req.params;
    const query = `
      SELECT image_id, image_url, upload_date, is_primary
      FROM dormitory_images 
      WHERE dorm_id = $1 
      ORDER BY is_primary DESC, upload_date DESC
    `;
    const result = await pool.query(query, [dormId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching dormitory images:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ===== ฟังก์ชันที่ไม่ใช้แล้วในระบบใหม่ =====

/*
// ไม่ใช้แล้ว - ระบบใหม่ไม่มี owner functions
exports.getDormitoriesByUserId = async (req, res) => { ... }
exports.getOwnerDormitories = async (req, res) => { ... }
exports.requestMembership = async (req, res) => { ... }
exports.getUserMembershipRequests = async (req, res) => { ... }
exports.selectCurrentDormitory = async (req, res) => { ... }

// ไม่ใช้แล้ว - ระบบใหม่ยังไม่มีรีวิว
exports.filterByRating = async (req, res) => { ... }

// ไม่ใช้แล้ว - ระบบใหม่ไม่มี room types
exports.advancedFilter = async (req, res) => { ... }

// ไม่ใช้แล้ว - ระบบใหม่ไม่มี owner management
exports.addRoomType = async (req, res) => { ... }
exports.updateRoomType = async (req, res) => { ... }
exports.deleteRoomType = async (req, res) => { ... }
*/