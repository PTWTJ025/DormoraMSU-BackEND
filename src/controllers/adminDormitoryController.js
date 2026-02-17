// src/controllers/adminDormitoryController.js
const pool = require("../db");

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
    console.error("Error fetching all dormitories:", error);
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

    console.log("🔍 [getPendingDormitories] Executing query:", query);
    const result = await pool.query(query);
    console.log("📊 [getPendingDormitories] Query result:", result.rows);
    console.log("📈 [getPendingDormitories] Number of pending dormitories:", result.rows.length);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching pending dormitories:", error);
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลหอพักที่รอการอนุมัติ" });
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
    console.error("Error updating dormitory approval:", error);
    res
      .status(500)
      .json({ message: "เกิดข้อผิดพลาดในการปรับปรุงสถานะการอนุมัติหอพัก" });
  } finally {
    client.release();
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
    console.error("Error fetching dormitory details for admin:", error);
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
    
    // สร้าง dynamic query สำหรับการอัปเดต
    const allowedFields = [
      'dorm_name', 'address', 'dorm_description', 'latitude', 'longitude',
      'electricity_price', 'water_price_type', 'water_price',
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
    
    await client.query("COMMIT");
    
    res.json({ message: "อัปเดตข้อมูลหอพักเรียบร้อยแล้ว" });
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating dormitory by admin:", error);
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

    // ลบข้อมูล amenity mapping
    await client.query(`DELETE FROM dormitory_amenity_mapping WHERE dorm_id = $1`, [dormId]);

    // ลบข้อมูลรูปภาพหอพัก
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
    console.error("Error deleting dormitory:", error);
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
        d.dorm_description,
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
    console.error("Error comparing dormitories:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเปรียบเทียบหอพัก" });
  }
};

