// ===== ปรับปรุงสำหรับระบบใหม่ =====
// ระบบใหม่มีเฉพาะ admin login เท่านั้น
// ไม่มี member/owner registration และ login

const firebaseAdmin = require('../config/firebase');
const userService = require('../services/userService');
const pool = require('../db');

// ===== ฟังก์ชันที่ยังใช้ได้ (Admin เท่านั้น) =====

// Admin login เท่านั้น
exports.adminLogin = async (req, res) => {
  try {
    const firebase_uid = req.user.uid; // uid from verified token

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์แอดมินหรือไม่
    let admin = await userService.getAdminByFirebaseUid(firebase_uid);

    if (!admin) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลแอดมินในระบบ' });
    }

    if (!admin.is_active) {
      return res.status(403).json({ message: 'บัญชีแอดมินถูกปิดใช้งาน' });
    }

    // อัพเดท last_login
    const updateResult = await pool.query(
      `UPDATE admins 
       SET last_login = NOW()
       WHERE admin_id = $1
       RETURNING *`,
      [admin.admin_id]
    );

    admin = updateResult.rows[0];

    // ใช้รูปจากฐานข้อมูล หรือสร้าง default avatar
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.display_name || admin.username)}&background=4F46E5&color=fff&size=200`;
    const finalPhotoURL = admin.photo_url || defaultAvatar;

    // ส่งข้อมูลแอดมินกลับไป
    const adminProfile = {
      uid: admin.firebase_uid,
      username: admin.username,
      email: admin.email,
      displayName: admin.display_name,
      photoURL: finalPhotoURL,
      memberType: 'admin', // หน้าบ้านใช้ memberType
      role: 'admin',
      lastLogin: admin.last_login
    };

    console.log('✅ [adminLogin] Admin profile:', {
      username: admin.username,
      photo_url_from_db: admin.photo_url,
      finalPhotoURL: finalPhotoURL
    });

    res.status(200).json(adminProfile);
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบแอดมิน', error: error.message });
  }
};

// ตรวจสอบความถูกต้องของ token
exports.verifyToken = async (req, res) => {
  try {
    const firebase_uid = req.user.uid;
    const tokenExpiry = new Date(req.user.exp * 1000);
    const now = new Date();
    const timeLeft = Math.floor((tokenExpiry - now) / 1000);

    console.log(`Token verification successful for UID: ${firebase_uid}`);
    console.log(`Token expires at: ${tokenExpiry.toISOString()}`);
    console.log(`Time left: ${timeLeft} seconds`);

    res.json({
      valid: true,
      uid: firebase_uid,
      expiresAt: tokenExpiry,
      timeLeft: timeLeft
    });
  } catch (error) {
    console.error('Error in token verification endpoint:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', error: error.message });
  }
};

// ดึงข้อมูลแอดมินที่ login อยู่
exports.getAdminProfile = async (req, res) => {
  try {
    const firebase_uid = req.user.uid;

    // ดึงข้อมูลแอดมิน
    const admin = await userService.getAdminByFirebaseUid(firebase_uid);

    if (!admin) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลแอดมินในระบบ' });
    }

    if (!admin.is_active) {
      return res.status(403).json({ message: 'บัญชีแอดมินถูกปิดใช้งาน' });
    }

    // ใช้รูปจากฐานข้อมูล หรือสร้าง default avatar
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.display_name || admin.username)}&background=4F46E5&color=fff&size=200`;
    const finalPhotoURL = admin.photo_url || defaultAvatar;

    // ส่งข้อมูลแอดมินกลับไป
    const adminProfile = {
      uid: admin.firebase_uid,
      username: admin.username,
      email: admin.email,
      displayName: admin.display_name,
      photoURL: finalPhotoURL,
      memberType: 'admin', // หน้าบ้านใช้ memberType
      role: 'admin',
      lastLogin: admin.last_login
    };

    res.status(200).json(adminProfile);
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแอดมิน', error: error.message });
  }
};

// ===== ฟังก์ชันที่ไม่ใช้แล้ว =====

/*
// ไม่ใช้แล้ว - ระบบใหม่ไม่มี member/owner login
exports.googleLogin = async (req, res) => {
  // ... original code ...
};

exports.registerWithEmail = async (req, res) => {
  // ... original code ...
};

exports.fetchCurrentUserProfile = async (req, res) => {
  // ... original code ...
};

exports.completeUserProfile = async (req, res) => {
  // ... original code ...
};

exports.getDormitoryOptions = async (req, res) => {
  // ... original code ...
};

exports.getAllUsers = async (req, res) => {
  // ... original code ...
};

exports.forgotPassword = async (req, res) => {
  // ... original code ...
};
*/