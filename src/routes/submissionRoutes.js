// src/routes/submissionRoutes.js
const express = require("express");
const router = express.Router();

const submissionController = require("../controllers/submissionController");
const upload = require("../middleware/uploadMiddleware");

// ===== PUBLIC ROUTES (ไม่ต้อง login) =====

// POST /api/submissions - ส่งข้อมูลหอพักจากฟอร์ม
router.post(
  "/",
  upload.array("images", 20), // รับรูปภาพสูงสุด 20 รูป
  submissionController.submitDormitory
);

// ===== ADMIN ROUTES =====
// ใช้ /api/admin/dormitories แทน (ดูที่ adminDormitoryRoutes.js)

module.exports = router;
