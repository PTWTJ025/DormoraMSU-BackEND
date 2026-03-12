// Simple one-off script for bulk-adding dormitories from a JSON array.
// ใช้เฉพาะชั่วคราวสำหรับ import หอ แล้วลบไฟล์นี้ทิ้งได้เลย

const pool = require("../src/db");
const logger = require("../src/logger");

// 1) วาง JSON ของหอทั้งหมดไว้ในตัวแปรนี้ แล้วค่อยรันไฟล์
// รูปแบบตัวอย่าง (รองรับรูปภาพด้วย ถ้ามี URL แล้ว):
//
// const dorms = [
//   {
//     "dorm_name": "หอ A",
//     "address": "ที่อยู่ A",
//     "zone_id": 1,
//     "monthly_price": 4500,
//     "daily_price": null,
//     "room_type": "ห้องแอร์",
//     "description": "คำอธิบาย (ไม่บังคับ)",
//     "latitude": 13.736717,
//     "longitude": 100.523186,
//     "summer_price": null,
//     "deposit": 5000,
//     "room_type_other": null,
//     "electricity_price_type": "per_unit", // หรือ "fixed"
//     "electricity_price": 8.0,
//     "water_price_type": "per_person", // หรือ "fixed"
//     "water_price": 100.0,
//     "contact_name": "เจ้าของหอ",
//     "contact_phone": "0812345678",
//     "contact_email": "owner@example.com",
//     "line_id": "lineid123",
//     // ใส่รูปหอถ้ามี "URL ที่อัปโหลดแล้ว" (ไม่ใช่ไฟล์ในเครื่อง)
//     "images": [ "https://...", "https://..." ],
//     "amenities": [ "WiFi", "ที่จอดรถ", "เครื่องซักผ้า" ]  // ชื่อต้องตรงกับในตาราง dormitory_amenities
//   }
// ];
//
// *** หมายเหตุ ***
// - สามารถตัด field ที่ไม่มีออกได้ ระบบจะใส่เป็น NULL ให้
// - approval_status จะตั้งให้เป็น 'approved' ให้เลย และ submitted_date = NOW()
// - ถ้ามี field images (array ของ URL) จะสร้างแถวในตาราง dormitory_images ให้
// - ถ้ามี field amenities (array ของชื่อสิ่งอำนวยความสะดวก) จะผูกกับ dormitory_amenity_mapping (ชื่อต้องตรงกับในตาราง dormitory_amenities)

const dorms = [

];

async function main() {
  if (!Array.isArray(dorms) || dorms.length === 0) {
    console.error(
      "❌ กรุณาใส่ข้อมูล dorms (JSON array) ในไฟล์ scripts/importDormsFromJson.js ก่อนรัน",
    );
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    console.log(`🚀 เริ่ม import หอจำนวน ${dorms.length} รายการ...`);
    await client.query("BEGIN");

    const inserted = [];

    for (const [index, dorm] of dorms.entries()) {
      const {
        dorm_name,
        address,
        zone_id,
        monthly_price,
        daily_price,
        room_type,
        description,
        latitude,
        longitude,
        summer_price,
        deposit,
        room_type_other,
        electricity_price_type,
        electricity_price,
        water_price_type,
        water_price,
        contact_name,
        contact_phone,
        contact_email,
        line_id,
        images, // optional: array ของ URL
        amenities, // optional: array ของชื่อสิ่งอำนวยความสะดวก (ต้องตรงกับ dormitory_amenities.amenity_name)
      } = dorm;

      if (!dorm_name || !address) {
        throw new Error(
          `แถวที่ ${index} ไม่มี dorm_name หรือ address (จำเป็นต้องมีอย่างน้อยสอง field นี้)`,
        );
      }

      const insertQuery = `
        INSERT INTO dormitories (
          dorm_name,
          address,
          zone_id,
          monthly_price,
          daily_price,
          room_type,
          description,
          latitude,
          longitude,
          summer_price,
          deposit,
          room_type_other,
          electricity_price_type,
          electricity_price,
          water_price_type,
          water_price,
          contact_name,
          contact_phone,
          contact_email,
          line_id,
          approval_status,
          submitted_date
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19, $20,
          'approved',
          NOW()
        )
        RETURNING dorm_id, dorm_name
      `;

      const values = [
        dorm_name,
        address,
        zone_id ?? null,
        monthly_price ?? null,
        daily_price ?? null,
        room_type ?? null,
        description ?? null,
        latitude ?? null,
        longitude ?? null,
        summer_price ?? null,
        deposit ?? null,
        room_type_other ?? null,
        electricity_price_type ?? null,
        electricity_price ?? null,
        water_price_type ?? null,
        water_price ?? null,
        contact_name ?? null,
        contact_phone ?? null,
        contact_email ?? null,
        line_id ?? null,
      ];

      const result = await client.query(insertQuery, values);
      const insertedDorm = result.rows[0];

      // ถ้ามี images เป็น array ของ URL → แทรกเข้า dormitory_images
      if (Array.isArray(images) && images.length > 0) {
        const filteredUrls = images
          .map((u) => (typeof u === "string" ? u.trim() : ""))
          .filter(Boolean);

        for (let i = 0; i < filteredUrls.length; i++) {
          const imageUrl = filteredUrls[i];
          const isPrimary = i === 0;

          await client.query(
            `INSERT INTO dormitory_images (dorm_id, image_url, is_primary, upload_date)
             VALUES ($1, $2, $3, NOW())`,
            [insertedDorm.dorm_id, imageUrl, isPrimary],
          );
        }
      }

      // ถ้ามี amenities เป็น array ของชื่อ → ผูกกับ dormitory_amenity_mapping
      if (Array.isArray(amenities) && amenities.length > 0) {
        const uniqueNames = [...new Set(amenities)].filter(
          (n) => n && typeof n === "string",
        );
        for (const amenityName of uniqueNames) {
          const name = amenityName.trim();
          if (!name) continue;
          const amenityResult = await client.query(
            `SELECT amenity_id FROM dormitory_amenities WHERE amenity_name = $1 LIMIT 1`,
            [name],
          );
          if (amenityResult.rows.length > 0) {
            await client.query(
              `INSERT INTO dormitory_amenity_mapping (dorm_id, amenity_id) VALUES ($1, $2)
               ON CONFLICT (dorm_id, amenity_id) DO NOTHING`,
              [insertedDorm.dorm_id, amenityResult.rows[0].amenity_id],
            );
          }
        }
      }

      inserted.push(insertedDorm);
      console.log(
        `✅ เพิ่มหอแล้ว dorm_id=${insertedDorm.dorm_id}, dorm_name="${insertedDorm.dorm_name}"`,
      );
    }

    await client.query("COMMIT");

    console.log("🎉 Import เสร็จเรียบร้อย");
    console.log("รวมทั้งหมด:", inserted.length, "รายการ");
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Error importing dorms from JSON:", error);
    console.error("❌ เกิดข้อผิดพลาดในการ import:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
