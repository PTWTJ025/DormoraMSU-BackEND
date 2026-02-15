// src/routes/submissionRoutes.js
const express = require("express");
const router = express.Router();

const submissionController = require("../controllers/submissionController");
const { verifyFirebaseToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// ===== PUBLIC ROUTES (ไม่ต้อง login) =====

// POST /api/submissions - ส่งข้อมูลหอพักจากฟอร์ม
router.post(
  "/",
  upload.array("images", 20), // รับรูปภาพสูงสุด 20 รูป
  submissionController.submitDormitory
);

// ===== ADMIN ROUTES (ต้อง login) =====

// GET /api/submissions - ดึงรายการ submissions ทั้งหมด (filter by status)
router.get(
  "/",
  verifyFirebaseToken,
  submissionController.getAllSubmissions
);

// GET /api/submissions/:submissionId - ดึงข้อมูล submission ตาม ID
router.get(
  "/:submissionId",
  verifyFirebaseToken,
  submissionController.getSubmissionById
);

// PUT /api/submissions/:submissionId - แก้ไข submission
router.put(
  "/:submissionId",
  verifyFirebaseToken,
  submissionController.updateSubmission
);

// POST /api/submissions/:submissionId/approve - อนุมัติ submission
router.post(
  "/:submissionId/approve",
  verifyFirebaseToken,
  submissionController.approveSubmission
);

// POST /api/submissions/:submissionId/reject - ปฏิเสธ submission
router.post(
  "/:submissionId/reject",
  verifyFirebaseToken,
  submissionController.rejectSubmission
);

// DELETE /api/submissions/:submissionId - ลบ submission
router.delete(
  "/:submissionId",
  verifyFirebaseToken,
  submissionController.deleteSubmission
);

module.exports = router;
