const pool = require("../db");
const { getOnlineCount } = require("../websocket/presenceServer");

/**
 * Get stats: dorm_count (จำนวนหอ) + visitor_count (ผู้เข้าชมสะสม)
 * Online count มาจาก WebSocket
 */
exports.getStats = async (req, res) => {
  try {
    // 1. Dorm count
    const dormResult = await pool.query(
      "SELECT COUNT(*) as total FROM dormitories WHERE approval_status = 'approved'"
    );
    const dorm_count = parseInt(dormResult.rows[0].total, 10);

    // 2. Visitor count (จาก website_stats)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_stats (
        id INTEGER PRIMARY KEY,
        visitor_count BIGINT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      INSERT INTO website_stats (id, visitor_count) VALUES (1, 0)
      ON CONFLICT (id) DO NOTHING
    `);
    const statsResult = await pool.query("SELECT visitor_count FROM website_stats WHERE id = 1");
    const visitor_count = parseInt(statsResult.rows[0].visitor_count, 10);

    res.json({ dorm_count, visitor_count });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/**
 * Increment visitor count (เรียกเมื่อมีการเข้าชมหน้าเว็บ)
 */
exports.incrementVisitorCount = async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_stats (
        id INTEGER PRIMARY KEY,
        visitor_count BIGINT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      INSERT INTO website_stats (id, visitor_count) VALUES (1, 1)
      ON CONFLICT (id) DO UPDATE SET visitor_count = website_stats.visitor_count + 1
    `);
    res.json({ message: "Visitor count incremented" });
  } catch (error) {
    console.error("Error incrementing visitor count:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/**
 * Get online count (จำนวนคนออนไลน์) - HTTP fallback ถ้าไม่ใช้ WebSocket
 */
exports.getOnlineCount = (req, res) => {
  res.json({ online_count: getOnlineCount() });
};

