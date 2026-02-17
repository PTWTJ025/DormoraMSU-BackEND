// src/db.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ใช้ Supabase REST API แทน Direct Database Connection
// เพื่อแก้ปัญหา IPv6 compatibility ใน Vercel

const supabaseUrl = process.env.SUPABASE_URL || 'https://spismpgbkrpkhedbeevh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error("Error: SUPABASE_SERVICE_KEY is not set in .env file.");
  process.exit(1);
}

// สร้าง Supabase client ด้วย service role key (สำหรับ backend)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Export supabase client แทน pg pool
module.exports = supabase;