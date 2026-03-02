// src/services/cleanupOrphanImagesService.js
// ลบรูปกำพร้า (orphan images) ที่ไม่ถูกชี้โดย dormitory_images (FK)

const pool = require("../db");
const logger = require("../logger");
const supabaseStorage = require("./supabaseStorageService");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = "dormitory-images";

/**
 * ดึง path ทั้งหมดที่ถูกอ้างอิงใน dormitory_images
 * @returns Set ของ paths เช่น "123/abc.jpg", "dorm-drafts/xyz.jpg" (ถ้ามี)
 */
async function getReferencedPaths() {
  const result = await pool.query(
    "SELECT image_url FROM dormitory_images"
  );

  const paths = new Set();
  for (const row of result.rows) {
    const url = row.image_url;
    if (!url) continue;

    // Extract path จาก URL หรือใช้ path โดยตรง (ถ้า Frontend ส่ง path มา)
    if (url.includes(BUCKET)) {
      const bucketIndex = url.split("/").findIndex((p) => p === BUCKET);
      const path = url.split("/").slice(bucketIndex + 1).join("/");
      paths.add(path);
    } else if (url.includes("/") && !url.startsWith("http")) {
      paths.add(url); // path โดยตรง เช่น "dorm-drafts/uuid-1.jpg"
    }
  }
  return paths;
}

/**
 * List ไฟล์ใน folder เดียว (Supabase ไม่มี recursive)
 */
async function listFolder(prefix) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000 });

  if (error) {
    logger.error(`Error listing ${prefix}`, { error });
    return { files: [], folders: [] };
  }

  const files = [];
  const folders = [];
  for (const item of data || []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      folders.push(fullPath);
    } else {
      files.push(fullPath);
    }
  }
  return { files, folders };
}

/**
 * List ไฟล์ทั้งหมดใน bucket (recursive โดยเรียก list ทีละ folder)
 */
async function listAllFiles() {
  const allFiles = [];
  const { folders } = await listFolder("");

  // รองรับไฟล์ที่อยู่ root ด้วย
  const root = await listFolder("");
  allFiles.push(...root.files);

  for (const folder of root.folders) {
    const { files } = await listFolder(folder);
    allFiles.push(...files);
  }

  return allFiles;
}

/**
 * ลบรูปกำพร้า
 * - dorm-drafts/: ลบไฟล์ที่อายุเกิน maxDraftAgeHours ชม. (default 24)
 * - {dormId}/: ลบไฟล์ที่ไม่มีใน dormitory_images
 */
exports.cleanupOrphanImages = async (options = {}) => {
  const {
    maxDraftAgeHours = 24,
    dryRun = false, // true = แค่ log ไม่ลบจริง
  } = options;

  const stats = {
    dormDraftsDeleted: 0,
    orphanDormImagesDeleted: 0,
    errors: [],
  };

  try {
    const referencedPaths = await getReferencedPaths();
    logger.debug("cleanup: found referenced paths", { count: referencedPaths.size });

    // 1. ลบไฟล์ใน dorm-drafts/ ที่อายุเกินกำหนด
    const { data: draftItems } = await supabase.storage
      .from(BUCKET)
      .list("dorm-drafts", { limit: 1000 });

    const now = Date.now();
    const maxAgeMs = maxDraftAgeHours * 60 * 60 * 1000;

    for (const item of draftItems || []) {
      if (item.id === null) continue; // ข้าม folder

      const path = `dorm-drafts/${item.name}`;
      const createdAt = item.created_at ? new Date(item.created_at).getTime() : 0;
      const ageMs = now - createdAt;

      if (ageMs > maxAgeMs) {
        if (!dryRun) {
          const { error } = await supabase.storage.from(BUCKET).remove([path]);
          if (error) {
            stats.errors.push({ path, error: error.message });
          } else {
            stats.dormDraftsDeleted++;
            logger.debug("cleanup: deleted old draft", { path });
          }
        } else {
          logger.debug("cleanup [dry-run]: would delete old draft", { path, ageHours: Math.round(ageMs / 3600000) });
          stats.dormDraftsDeleted++;
        }
      }
    }

    // 2. List ไฟล์ทั้งหมดใน bucket (ยกเว้น dorm-drafts ที่จัดการแล้ว)
    const allFiles = await listAllFiles();
    const filesToCheck = allFiles.filter((f) => !f.startsWith("dorm-drafts/"));

    // 3. ลบไฟล์ใน {dormId}/ ที่ไม่มีใน dormitory_images
    for (const filePath of filesToCheck) {
      if (referencedPaths.has(filePath)) continue;

      if (!dryRun) {
        const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
        if (error) {
          stats.errors.push({ path: filePath, error: error.message });
        } else {
          stats.orphanDormImagesDeleted++;
          logger.debug("cleanup: deleted orphan", { filePath });
        }
      } else {
        logger.debug("cleanup [dry-run]: would delete orphan", { filePath });
        stats.orphanDormImagesDeleted++;
      }
    }

    logger.info("cleanup: done", { drafts: stats.dormDraftsDeleted, orphans: stats.orphanDormImagesDeleted });
    return stats;
  } catch (err) {
    logger.error("cleanup: error", { error: err.message });
    stats.errors.push({ error: err.message });
    throw err;
  }
};
