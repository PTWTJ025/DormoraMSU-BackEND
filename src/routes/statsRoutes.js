const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// GET /api/stats - Get all stats
router.get('/', statsController.getStats);

// POST /api/stats/visitor - Increment visitor count
router.post('/visitor', statsController.incrementVisitorCount);

module.exports = router;
