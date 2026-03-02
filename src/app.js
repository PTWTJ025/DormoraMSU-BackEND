// src/app.js
require('dotenv').config();

const admin = require('./config/firebase');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { createPresenceServer } = require('./websocket/presenceServer');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Import Routes ที่ยังใช้ได้ในระบบใหม่
const authRoutes = require('./routes/auth');
const dormitoryRoutes = require('./routes/dormitoryRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const adminDormitoryRoutes = require('./routes/adminDormitoryRoutes');
const submissionRoutes = require('./routes/submissionRoutes'); // ระบบรับข้อมูลจากฟอร์ม
const statsRoutes = require('./routes/statsRoutes'); // สถิติผู้เข้าชม


// ===== Routes ที่ไม่ใช้แล้วในระบบใหม่ =====
/*
const addDormitoryRoutes = require('./routes/addDormitoryRoutes');
const deleteDormitoryRoutes = require('./routes/deleteDormitoryRoutes');
const profileRoutes = require('./routes/profileRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const editDormitoryRoutes = require('./routes/editDormitoryRoutes');
*/

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); // ทำให้เข้าถึงไฟล์ใน uploads ได้

// Basic Route (สำหรับทดสอบว่า Backend รันอยู่)
app.get('/', (req, res) => {
  res.send('DormRoomaroo Backend API is running! (New System - Admin Only)');
});

// API Routes ที่ยังใช้ได้
app.use('/api/auth', authRoutes);
app.use('/api/api/auth', authRoutes); // เพิ่ม route สำหรับแก้ปัญหา /api/api/ ที่ Frontend เรียกผิด
app.use('/api/dormitories', dormitoryRoutes); // Public API สำหรับดูหอพัก
app.use('/api/zones', zoneRoutes); // Public API สำหรับดูโซน
app.use('/api/submissions', submissionRoutes); // Public API สำหรับส่งข้อมูลหอพัก
app.use('/api/stats', statsRoutes); // Public API สำหรับสถิติ
app.use('/api/admin/dormitories', adminDormitoryRoutes); // Admin API

app.use('/api/admin/submissions', adminDormitoryRoutes); // Alias: submissions = dormitories ที่รออนุมัติ

// ===== Routes ที่ไม่ใช้แล้วในระบบใหม่ =====
/*
app.use('/api/add-dormitory', addDormitoryRoutes);
app.use('/api/delete-dormitory', deleteDormitoryRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/edit-dormitory', editDormitoryRoutes);
*/

// WebSocket Presence (Online count)
createPresenceServer(server);

// Start Server
server.listen(PORT, () => {
  console.log(`DormRoomaroo API listening on port ${PORT}`);
  console.log(`🏠 New System: Public form + Admin approval`);
  console.log(`📊 Database: Supabase PostgreSQL`);
  console.log(`📁 Storage: Supabase Storage`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
});

module.exports = app;