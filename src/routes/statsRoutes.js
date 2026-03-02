const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// GET /api/stats - Get dormitory count (จำนวนหอ)
router.get('/', statsController.getStats);

module.exports = router;
