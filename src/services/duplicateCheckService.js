/**
 * บริการช่วยแอดมินเช็คหอที่อาจซ้ำ (ไม่แก้ไขข้อมูล แค่ค้นหาและแสดง)
 * - เช็คจากพิกัดใกล้เคียง (ระยะทางเมตร)
 * - เช็คจากชื่อคล้ายกัน (รองรับไทย/อังกฤษ และชื่อสะกดใกล้เคียง)
 */

const logger = require("../logger");

// คำที่ตัดออกเวลาเทียบชื่อ (คำทั่วไปที่คนเติมต่างกัน)
const NAME_STOP_WORDS = [
  "หอพัก", "หอ", "แมนชั่น", "แมนชัน", "อพาร์ตเมนต์", "อพาร์ทเมนต์",
  "คอนโด", "คอนโดมิเนียม", "dorm", "apartment", "condo", "mansion",
  "บ้านพัก", "ที่พัก", "ห้องพัก", "co-living", "co living"
];

/**
 * ปรับชื่อหอให้เทียบง่าย: ตัดคำซ้ำซ้อน, ช่องว่างเดียว, ตัวเล็ก
 */
function normalizeDormName(name) {
  if (!name || typeof name !== "string") return "";
  let s = name
    .trim()
    .toLowerCase()
    // unify separators/punctuation as spaces
    .replace(/[\-–—_.,/\\|(){}\[\]:"'’“”]+/g, " ")
    .replace(/\s+/g, " ");
  for (const word of NAME_STOP_WORDS) {
    // NOTE: Thai doesn't work well with \\b word boundaries, so we remove stopwords
    // by matching them with flexible whitespace, without relying on \\b.
    const re = new RegExp("(^|\\s)" + word.replace(/\s+/g, "\\s*") + "(?=\\s|$)", "gi");
    s = s.replace(re, " ");
  }
  return s.replace(/\s+/g, " ").trim();
}

/**
 * ระยะทางโดยประมาณระหว่างสองจุด (เมตร) - Haversine
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // รัศมีโลกเมตร
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Levenshtein distance แล้วแปลงเป็นความคล้าย (0–1)
 */
function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0 && lenB === 0) return 1;
  if (lenA === 0 || lenB === 0) return 0;

  const matrix = [];
  for (let i = 0; i <= lenA; i++) matrix[i] = [i];
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const distance = matrix[lenA][lenB];
  const maxLen = Math.max(lenA, lenB);
  return 1 - distance / maxLen;
}

/**
 * เช็คว่าชื่อคล้ายกันพอ (รวมกรณี substring เช่น ชื่อหนึ่งมีอีกชื่ออยู่ภายใน)
 */
function isNameSimilar(normCurrent, normOther, threshold = 0.4) {
  if (!normCurrent || !normOther) return false;
  if (normCurrent === normOther) return true;
  if (normCurrent.includes(normOther) || normOther.includes(normCurrent)) return true;
  return stringSimilarity(normCurrent, normOther) >= threshold;
}

/** ระยะในเมตรที่ถือว่า "ใกล้เคียง" */
const NEARBY_METERS = 5;

/** ความเข้มของการจับชื่อคล้าย (ยิ่งสูงยิ่งเข้ม) */
const NAME_SIMILARITY_THRESHOLD = 0.6;

/**
 * ค้นหาหอที่อนุมัติแล้วที่อาจซ้ำกับหอที่กำหนด
 * @param {object} pool - pg pool
 * @param {object} currentDorm - { dorm_id, dorm_name, address, latitude, longitude }
 * @returns {Promise<Array>} รายการ { dorm_id, dorm_name, address, zone_name, distance_meters, match_reasons }
 */
async function findSimilarApprovedDormitories(pool, currentDorm) {
  const currentId = currentDorm.dorm_id;
  const currentLat = currentDorm.latitude != null ? Number(currentDorm.latitude) : null;
  const currentLon = currentDorm.longitude != null ? Number(currentDorm.longitude) : null;
  const normCurrentName = normalizeDormName(currentDorm.dorm_name || "");

  const query = `
    SELECT
      d.dorm_id,
      d.dorm_name,
      d.address,
      d.latitude,
      d.longitude,
      z.zone_name
    FROM dormitories d
    LEFT JOIN zones z ON d.zone_id = z.zone_id
    WHERE d.approval_status = 'approved'
      AND d.dorm_id != $1
  `;
  const result = await pool.query(query, [currentId]);
  const candidates = result.rows;

  const out = [];
  for (const row of candidates) {
    const matchReasons = [];
    let distanceMeters = null;

    if (currentLat != null && currentLon != null && row.latitude != null && row.longitude != null) {
      const dist = haversineDistanceMeters(
        currentLat, currentLon,
        Number(row.latitude), Number(row.longitude)
      );
      if (dist <= NEARBY_METERS) {
        matchReasons.push("พิกัดใกล้เคียง");
        distanceMeters = Math.round(dist);
      }
    }

    const normOther = normalizeDormName(row.dorm_name || "");
    if (isNameSimilar(normCurrentName, normOther, NAME_SIMILARITY_THRESHOLD)) {
      matchReasons.push("ชื่อคล้ายกัน");
    }

    if (matchReasons.length > 0) {
      out.push({
        dorm_id: row.dorm_id,
        dorm_name: row.dorm_name,
        address: row.address,
        zone_name: row.zone_name,
        distance_meters: distanceMeters,
        match_reasons: matchReasons,
      });
    }
  }

  // เรียง: มีทั้งพิกัด+ชื่อ มาก่อน แล้วตามด้วยระยะใกล้
  out.sort((a, b) => {
    const scoreA = (a.match_reasons.length * 10) - (a.distance_meters ?? 9999) / 100;
    const scoreB = (b.match_reasons.length * 10) - (b.distance_meters ?? 9999) / 100;
    return scoreB - scoreA;
  });

  return out.slice(0, 20);
}

module.exports = {
  normalizeDormName,
  haversineDistanceMeters,
  stringSimilarity,
  findSimilarApprovedDormitories,
};
