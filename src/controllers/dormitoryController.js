// ===== ปรับปรุงสำหรับระบบใหม่ =====
// ใช้ตาราง dormitories (เดิมชื่อ raw_submissions)
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
      FROM dormitories
      WHERE approval_status = 'approved'
        AND dorm_name ILIKE $1
      ORDER BY dorm_name
      LIMIT $2
    `;

    const values = [`%${rawQuery}%`, limit];

    const result = await pool.query(sql, values);

    const items = result.rows.map((r) => ({
      id: r.dorm_id,
      name: r.dorm_name,
    }));

    res.json(items);
  } catch (error) {
    console.error("Error searching dorm names:", error);
    res
      .status(500)
      .json({
        message: "เกิดข้อผิดพลาดในการค้นหาชื่อหอพัก",
        error: error.message,
      });
  }
};

// ดึงรายการโซนทั้งหมด
exports.getAllZones = async (req, res) => {
  try {
    const query =
      "SELECT zone_id, zone_name FROM zones WHERE is_active = true ORDER BY zone_name";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching zones:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
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
    const amenities = result.rows.map((row) => row.amenity_name);

    res.json(amenities);
  } catch (error) {
    console.error("Error fetching amenities:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
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
      FROM dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.dorm_id = $1 AND d.approval_status = 'approved'
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

    // 3. ดึงสิ่งอำนวยความสะดวกของหอพัก (ผ่าน mapping table)
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

    // 4. รีวิว (ยังไม่มีในระบบใหม่)
    const reviews = [];

    // 5. คะแนนเฉลี่ย (ยังไม่มีในระบบใหม่)
    const rating_summary = {
      review_count: 0,
      average_rating: 0,
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
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
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
            WHEN d.monthly_price IS NOT NULL AND d.monthly_price > 0 
            THEN GREATEST(0, (10000 - d.monthly_price) / 1000) * 0.5
            WHEN d.daily_price IS NOT NULL AND d.daily_price > 0
            THEN GREATEST(0, (500 - d.daily_price) / 100) * 0.5
            ELSE 0 
          END +
          COALESCE((SELECT COUNT(*) FROM dormitory_amenity_mapping WHERE dorm_id = d.dorm_id), 0) * 0.3 +
          COALESCE((SELECT COUNT(*) FROM dormitory_images WHERE dorm_id = d.dorm_id), 0) * 0.2
        ) AS recommendation_score,
        (SELECT COUNT(*) FROM dormitory_amenity_mapping WHERE dorm_id = d.dorm_id) AS amenities_count,
        (SELECT COUNT(*) FROM dormitory_images WHERE dorm_id = d.dorm_id) AS images_count
      FROM dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.approval_status = 'approved'
      ORDER BY 
        recommendation_score DESC,
        amenities_count DESC,
        images_count DESC,
        d.submitted_date DESC`;
    const values = [];
    if (limit) {
      values.push(parseInt(limit, 10));
      query += ` LIMIT $1`;
    }
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching recommended dormitories:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
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
      FROM dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.approval_status = 'approved'
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
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
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
      FROM dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
      WHERE d.approval_status = 'approved'
      ORDER BY d.submitted_date DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all approved dormitories:", error);
    res
      .status(500)
      .json({
        message: "เกิดข้อผิดพลาดในการดึงข้อมูลหอพักทั้งหมด",
        error: error.message,
      });
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
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// หอพักที่คล้ายกัน (อิงโซน/ราคา/ประเภทห้อง/amenities)
exports.getSimilarDormitories = async (req, res) => {
  try {
    const { dormId } = req.params;
    const limitParam = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 50)
      : 10;

    // 1) เอาหอหลัก (ต้อง approved)
    const baseDormQuery = `
      SELECT dorm_id, zone_id, monthly_price, daily_price, room_type
      FROM dormitories
      WHERE dorm_id = $1 AND approval_status = 'approved'
    `;
    const baseDormResult = await pool.query(baseDormQuery, [dormId]);
    if (baseDormResult.rows.length === 0) {
      return res.status(404).json({ message: "Dormitory not found" });
    }
    const baseDorm = baseDormResult.rows[0];

    // 2) คำนวนความคล้ายแบบง่าย:
    // - โซนเดียวกัน (hard filter)
    // - room_type ตรงกันได้แต้ม
    // - ราคาใกล้กันได้แต้ม (ใช้ monthly ถ้ามี ไม่งั้น daily)
    // - amenities overlap ได้แต้ม
    const query = `
      WITH base_amenities AS (
        SELECT amenity_id
        FROM dormitory_amenity_mapping
        WHERE dorm_id = $1
      ),
      candidate AS (
        SELECT
          d.dorm_id,
          d.dorm_name,
          d.address,
          d.description,
          d.latitude,
          d.longitude,
          d.zone_id,
          z.zone_name,
          d.monthly_price,
          d.daily_price,
          d.summer_price,
          d.deposit,
          d.room_type,
          d.electricity_price,
          d.water_price_type,
          d.water_price,
          d.contact_name,
          d.contact_phone,
          d.contact_email,
          d.line_id,
          (
            SELECT image_url FROM dormitory_images
            WHERE dorm_id = d.dorm_id
            ORDER BY is_primary DESC, upload_date DESC, image_id ASC
            LIMIT 1
          ) AS main_image_url,
          COALESCE((
            SELECT COUNT(*)
            FROM dormitory_amenity_mapping dam
            WHERE dam.dorm_id = d.dorm_id
          ), 0) AS amenities_count,
          COALESCE((
            SELECT COUNT(*)
            FROM dormitory_images di
            WHERE di.dorm_id = d.dorm_id
          ), 0) AS images_count,
          COALESCE((
            SELECT COUNT(*)
            FROM dormitory_amenity_mapping dam
            WHERE dam.dorm_id = d.dorm_id
              AND dam.amenity_id IN (SELECT amenity_id FROM base_amenities)
          ), 0) AS amenity_overlap
        FROM dormitories d
        LEFT JOIN zones z ON d.zone_id = z.zone_id
        WHERE d.approval_status = 'approved'
          AND d.dorm_id <> $1
          AND d.zone_id = $2
      )
      SELECT
        c.*,
        0 AS avg_rating,
        0 AS review_count,
        (
          -- price similarity: ยิ่งใกล้กันยิ่งได้แต้ม (0..1) * 0.4
          (
            CASE
              WHEN $3 IS NOT NULL AND c.monthly_price IS NOT NULL AND c.monthly_price > 0 AND $3 > 0
                THEN (1.0 / (1.0 + (ABS(c.monthly_price - $3) / GREATEST($3, 1))))
              WHEN $4 IS NOT NULL AND c.daily_price IS NOT NULL AND c.daily_price > 0 AND $4 > 0
                THEN (1.0 / (1.0 + (ABS(c.daily_price - $4) / GREATEST($4, 1))))
              ELSE 0
            END
          ) * 0.4
          +
          -- room_type match * 0.2
          (CASE WHEN $5 IS NOT NULL AND c.room_type = $5 THEN 1 ELSE 0 END) * 0.2
          +
          -- amenity overlap: ยิ่งซ้ำกันยิ่งได้แต้ม * 0.3
          (LEAST(c.amenity_overlap, 10) / 10.0) * 0.3
          +
          -- richness (images/amenities) * 0.1
          (LEAST(c.amenities_count, 20) / 20.0) * 0.05
          +
          (LEAST(c.images_count, 20) / 20.0) * 0.05
        ) AS similarity_score
      FROM candidate c
      ORDER BY
        similarity_score DESC,
        c.amenity_overlap DESC,
        c.amenities_count DESC,
        c.images_count DESC,
        c.dorm_id DESC
      LIMIT $6
    `;

    const values = [
      dormId,
      baseDorm.zone_id,
      baseDorm.monthly_price,
      baseDorm.daily_price,
      baseDorm.room_type,
      limit,
    ];

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching similar dormitories:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
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

// เปรียบเทียบหอพักหลายตัว (สำหรับคนทั่วไป)
exports.compareDormitories = async (req, res) => {
  try {
    const { dormIds, ids } = req.query; // รองรับทั้ง dormIds และ ids
    const queryParam = dormIds || ids; // ใช้ dormIds ก่อน ถ้าไม่มีใช้ ids

    if (!queryParam) {
      return res.status(400).json({ message: "กรุณาระบุ dormIds หรือ ids" });
    }

    // แปลง string เป็น array of integers
    const idsArray = queryParam
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (idsArray.length === 0) {
      return res.status(400).json({ message: "dormIds/ids ไม่ถูกต้อง" });
    }

    console.log("🔍 [compareDormitories] Comparing dormitories:", idsArray);

    // Query ข้อมูลหอพักทั้งหมดที่ต้องการเปรียบเทียบ (เฉพาะที่ approved)
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
        d.monthly_price,
        d.daily_price,
        d.summer_price,
        d.deposit,
        d.room_type,
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
      WHERE d.dorm_id = ANY($1) AND d.approval_status = 'approved'
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
    amenitiesResult.rows.forEach((row) => {
      if (!amenitiesByDorm[row.dorm_id]) {
        amenitiesByDorm[row.dorm_id] = [];
      }
      amenitiesByDorm[row.dorm_id].push({
        amenity_id: row.amenity_id,
        amenity_name: row.amenity_name,
      });
    });

    // รวมข้อมูลทั้งหมด
    const response = dormResult.rows.map((dorm) => ({
      ...dorm,
      latitude: dorm.latitude ? Number(dorm.latitude) : null,
      longitude: dorm.longitude ? Number(dorm.longitude) : null,
      amenities: amenitiesByDorm[dorm.dorm_id] || [],
    }));

    console.log(
      "✅ [compareDormitories] Returning",
      response.length,
      "dormitories",
    );
    res.json(response);
  } catch (error) {
    console.error("Error comparing dormitories:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเปรียบเทียบหอพัก" });
  }
};

// กรองหอพักตามเงื่อนไข
exports.filterDormitories = async (req, res) => {
  try {
    const {
      zone_id,
      min_price,
      max_price,
      price_type, // 'monthly' หรือ 'daily'
      room_type,
      amenities, // array ของ amenity names
      limit = 50,
      offset = 0,
    } = req.query;

    console.log("🔍 [filterDormitories] Filter params:", req.query);

    let whereConditions = ["d.approval_status = 'approved'"];
    let queryParams = [];
    let paramCount = 1;

    // กรองตามโซน
    if (zone_id) {
      whereConditions.push(`d.zone_id = $${paramCount}`);
      queryParams.push(parseInt(zone_id));
      paramCount++;
    }

    // กรองตามราคา
    if (min_price || max_price) {
      const priceColumn =
        price_type === "daily" ? "daily_price" : "monthly_price";

      if (min_price) {
        whereConditions.push(`d.${priceColumn} >= $${paramCount}`);
        queryParams.push(parseFloat(min_price));
        paramCount++;
      }

      if (max_price) {
        whereConditions.push(`d.${priceColumn} <= $${paramCount}`);
        queryParams.push(parseFloat(max_price));
        paramCount++;
      }
    }

    // กรองตามประเภทห้อง
    if (room_type) {
      whereConditions.push(`d.room_type = $${paramCount}`);
      queryParams.push(room_type);
      paramCount++;
    }

    // สร้าง base query
    let query = `
      SELECT DISTINCT
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
      FROM dormitories d
      LEFT JOIN zones z ON d.zone_id = z.zone_id
    `;

    // ถ้ามีการกรองตาม amenities
    if (amenities) {
      const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
      query += `
        INNER JOIN dormitory_amenity_mapping dam ON d.dorm_id = dam.dorm_id
        INNER JOIN dormitory_amenities da ON dam.amenity_id = da.amenity_id
      `;
      whereConditions.push(`da.amenity_name = ANY($${paramCount})`);
      queryParams.push(amenitiesArray);
      paramCount++;
    }

    // เพิ่ม WHERE clause
    query += ` WHERE ${whereConditions.join(" AND ")}`;

    // เพิ่ม ORDER BY
    query += ` ORDER BY d.submitted_date DESC`;

    // เพิ่ม LIMIT และ OFFSET
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(parseInt(limit));
    queryParams.push(parseInt(offset));

    console.log("📊 [filterDormitories] Executing query:", query);
    console.log("📊 [filterDormitories] Query params:", queryParams);

    const result = await pool.query(query, queryParams);

    console.log(
      "✅ [filterDormitories] Found",
      result.rows.length,
      "dormitories",
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error filtering dormitories:", error);
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการกรองหอพัก", error: error.message });
  }
};
