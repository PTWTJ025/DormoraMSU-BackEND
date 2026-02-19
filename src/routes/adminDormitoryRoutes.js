const express = require('express');
const router = express.Router();
const adminDormitoryController = require('../controllers/adminDormitoryController');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/authMiddleware');

// ===== ADMIN ROUTES =====

// ดูรายการหอพักทั้งหมด (root endpoint สำหรับ /api/admin/submissions)
router.get('/', verifyFirebaseToken, requireAdmin, adminDormitoryController.getAllDormitories);

// ดูรายการหอพักทั้งหมด (alias)
router.get('/all', verifyFirebaseToken, requireAdmin, adminDormitoryController.getAllDormitories);

// ดูรายการหอพักที่รอการอนุมัติ
router.get('/pending', verifyFirebaseToken, requireAdmin, adminDormitoryController.getPendingDormitories);

// ลบรูปกำพร้า (ต้องอยู่ก่อน :dormId เพื่อไม่ให้ match ผิด)
router.get('/cleanup/orphan-images', verifyFirebaseToken, requireAdmin, adminDormitoryController.cleanupOrphanImages);

// ดูรายละเอียดหอพักแต่ละตัว (สำหรับแอดมิน)
router.get('/:dormId', verifyFirebaseToken, requireAdmin, adminDormitoryController.getDormitoryDetailsByAdmin);

// อนุมัติ/ปฏิเสธหอพัก
router.put('/:dormId/approval', verifyFirebaseToken, requireAdmin, adminDormitoryController.updateDormitoryApproval);

// แก้ไขหอพักโดยแอดมิน
router.put('/:dormId', verifyFirebaseToken, requireAdmin, adminDormitoryController.updateDormitoryByAdmin);

// ลบหอพัก
router.delete('/:dormId', verifyFirebaseToken, requireAdmin, adminDormitoryController.deleteDormitory);

module.exports = router; 