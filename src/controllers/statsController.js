const pool = require("../db");

/**
 * Get dormitory count (จำนวนหอในระบบ)
 * ผู้เข้าชมใช้ Google Analytics
 */
exports.getStats = async (req, res) => {
  try {
    const dormResult = await pool.query(
      "SELECT COUNT(*) as total FROM dormitories WHERE approval_status = 'approved'"
    );
    const dorm_count = parseInt(dormResult.rows[0].total, 10);

    res.json({ dorm_count });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

