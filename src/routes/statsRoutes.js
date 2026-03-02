const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// GET /api/stats - Get dorm_count + visitor_count
router.get('/', statsController.getStats);

// POST /api/stats/visitor - Increment visitor count (เรียกเมื่อเข้าหน้าเว็บ)
router.post('/visitor', statsController.incrementVisitorCount);

// GET /api/stats/online - Online count (HTTP fallback ถ้าไม่ใช้ WebSocket)
router.get('/online', statsController.getOnlineCount);

module.exports = router;
