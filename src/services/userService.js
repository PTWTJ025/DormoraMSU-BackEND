// ===== บางส่วนไม่ใช้แล้วในระบบใหม่ =====
// ระบบใหม่ไม่มี member และ owner registration
// เหลือเฉพาะ admin management
// ฟังก์ชันที่ยังใช้: admin-related functions เท่านั้น

const pool = require('../db');

// ===== ฟังก์ชันที่ยังใช้ได้ =====

async function generateUsernameFromEmail(email) {
    let baseUsername = email.split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    baseUsername = baseUsername.substring(0, 15);

    let username = baseUsername + Math.floor(Math.random() * 1000);

    let counter = 0;
    while (counter < 10) {
        const result = await pool.query(
            'SELECT COUNT(*) FROM admins WHERE username = $1', // เปลี่ยนจาก users เป็น admins
            [username]
        );

        if (result.rows[0].count == 0) {
            return username;
        }

        username = baseUsername + Math.floor(Math.random() * 1000);
        counter++;
    }
    return baseUsername + Date.now().toString().slice(-3);
}

// ฟังก์ชันสำหรับ admin เท่านั้น
async function getAdminByFirebaseUid(firebase_uid) {
    const result = await pool.query(
        'SELECT * FROM admins WHERE firebase_uid = $1',
        [firebase_uid]
    );
    return result.rows[0] || null;
}

async function createAdmin({ firebase_uid, email, displayName, photoUrl }) {
    const username = await generateUsernameFromEmail(email);
    
    const result = await pool.query(
        `INSERT INTO admins (firebase_uid, username, email, display_name, photo_url, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [firebase_uid, username, email, displayName, photoUrl]
    );
    
    return result.rows[0];
}

// ===== ฟังก์ชันที่ไม่ใช้แล้ว =====

/*
// ไม่ใช้แล้ว - ระบบใหม่ไม่มี member/owner registration
async function findOrCreateUser({ firebase_uid, email, displayName, photoURL, memberType }) {
    // ... original code ...
}

async function upsertUserWithEmail({ firebase_uid, email, displayName, photoUrl, memberType, phoneNumber, residenceDormId, managerName, secondaryPhone, lineId }) {
    // ... original code ...
}

async function getUserByFirebaseUid(firebase_uid) {
    // ... original code ...
}

async function updateProfile(firebase_uid, userData) {
    // ... original code ...
}

async function createNewUser(userData) {
    // ... original code ...
}
*/

module.exports = {
    generateUsernameFromEmail,
    getAdminByFirebaseUid,
    createAdmin
    
    // ไม่ export ฟังก์ชันที่ไม่ใช้แล้ว
    // findOrCreateUser,
    // upsertUserWithEmail,
    // getUserByFirebaseUid,
    // updateProfile,
    // createNewUser
};