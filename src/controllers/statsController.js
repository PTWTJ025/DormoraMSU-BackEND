const pool = require("../db");

/**
 * Get website statistics
 */
exports.getStats = async (req, res) => {
  try {
    // Auto-create table if not exists (Lazy initialization)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_stats (
        id INTEGER PRIMARY KEY,
        visitor_count BIGINT DEFAULT 0,
        submission_count BIGINT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure row with id=1 exists
    await pool.query(`
      INSERT INTO website_stats (id, visitor_count)
      VALUES (1, 0)
      ON CONFLICT (id) DO NOTHING
    `);

    // 1. Get visitor count
    const statsResult = await pool.query("SELECT visitor_count FROM website_stats WHERE id = 1");
    const visitorCount = parseInt(statsResult.rows[0].visitor_count, 10);

    // 2. Get total dormitory submissions (all statuses)
    const dormResult = await pool.query("SELECT COUNT(*) as total FROM dormitories");
    const submissionCount = parseInt(dormResult.rows[0].total, 10);

    res.json({
      visitor_count: visitorCount,
      submission_count: submissionCount
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

/**
 * Increment visitor count
 */
exports.incrementVisitorCount = async (req, res) => {
  try {
    // Also ensure table exists here for robustness
    await pool.query(`
      INSERT INTO website_stats (id, visitor_count) 
      VALUES (1, 1) 
      ON CONFLICT (id) 
      DO UPDATE SET visitor_count = website_stats.visitor_count + 1
    `);
    
    res.json({ message: "Visitor count incremented" });
  } catch (error) {
    console.error("Error incrementing visitor count:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

