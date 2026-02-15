const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyFirebaseToken } = require('../middleware/authMiddleware');

// ===== Routes ที่ยังใช้ได้ในระบบใหม่ =====

// Route สำหรับการเข้าสู่ระบบแอดมิน (Firebase)
router.post('/admin-login', verifyFirebaseToken, authController.adminLogin);

// Route สำหรับดึงข้อมูลแอดมินที่ login อยู่
router.get('/admin/me', verifyFirebaseToken, authController.getAdminProfile);

// Route สำหรับตรวจสอบความถูกต้องของ token
router.get('/verify-token', verifyFirebaseToken, authController.verifyToken);

// ===== Routes ที่ไม่ใช้แล้วในระบบใหม่ =====

/*
// ไม่ใช้แล้ว - ระบบใหม่ไม่มี member/owner login
router.post('/google-login', verifyFirebaseToken, authController.googleLogin);

// ไม่ใช้แล้ว - ระบบใหม่ไม่มี user registration
router.post('/register', verifyFirebaseToken, uploadProfileImage.single('profileImage'), authController.registerWithEmail);

// ไม่ใช้แล้ว - ระบบใหม่ไม่มี user profiles
router.get('/me', verifyFirebaseToken, authController.fetchCurrentUserProfile);
router.put('/me', verifyFirebaseToken, authController.completeUserProfile);

// ไม่ใช้แล้ว - ระบบใหม่ไม่มี user management
router.get('/users', authController.getAllUsers);

// ไม่ใช้แล้ว - ระบบใหม่ไม่มี password reset
router.post('/forgot-password', authController.forgotPassword);
*/

module.exports = router;