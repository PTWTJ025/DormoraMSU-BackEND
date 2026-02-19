// src/routes/submissionRoutes.js
const express = require("express");
const router = express.Router();

const submissionController = require("../controllers/submissionController");

// ===== PUBLIC ROUTES (ไม่ต้อง login) =====

// POST /api/submissions - ส่งข้อมูลหอพักจากฟอร์ม (รับ JSON แทน FormData)
router.post(
  "/",
  express.json(), // รับ JSON body
  submissionController.submitDormitory
);

// ===== ADMIN ROUTES =====
// ใช้ /api/admin/dormitories แทน (ดูที่ adminDormitoryRoutes.js)

module.exports = router;
