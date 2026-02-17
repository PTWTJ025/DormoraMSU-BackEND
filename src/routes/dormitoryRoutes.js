// src/routes/dormitoryRoutes.js
const express = require("express");
const router = express.Router();

// ===== Controllers =====
const dormitoryController = require("../controllers/dormitoryController");

// ===== PUBLIC DORMITORY ROUTES (ที่ยังใช้ได้) =====

// ดึงรายการโซน
router.get("/zones", dormitoryController.getAllZones);

// ดึงรายการสิ่งอำนวยความสะดวกทั้งหมด
router.get("/amenities", dormitoryController.getAllAmenities);

// ดึงรายการหอพักทั้งหมดที่อนุมัติแล้ว (public)
router.get("/", dormitoryController.getAllApprovedDormitories);

// ค้นหาชื่อหอพัก (autocomplete)
router.get("/search", dormitoryController.searchDormNames);

// หอพักแนะนำ
router.get("/recommended", dormitoryController.getRecommendedDormitories);

// หอพักล่าสุด
router.get("/latest", dormitoryController.getLatestDormitories);

// เปรียบเทียบหอพักหลายตัว (ต้องอยู่ก่อน /:dormId)
router.get("/compare", dormitoryController.compareDormitories);

// กรองหอพัก (ต้องอยู่ก่อน /:dormId)
router.get("/filter", dormitoryController.filterDormitories);

// ดึงข้อมูลหอพักตาม ID
router.get("/:dormId", dormitoryController.getDormitoryById);

// ดึงรูปภาพหอพัก
router.get("/:dormId/images", dormitoryController.getDormitoryImages);

// ===== Routes ที่ไม่ใช้แล้วในระบบใหม่ =====

/*
// ไม่ใช้แล้ว - ระบบใหม่ไม่มี owner functions
router.get("/user/:userId", dormitoryController.getDormitoriesByUserId);
router.get("/owner", verifyFirebaseToken, dormitoryController.getOwnerDormitories);

// ไม่ใช้แล้ว - ระบบใหม่ไม่มี member functions
router.post("/request-membership", verifyFirebaseToken, dormitoryController.requestMembership);
router.get("/my/requests", verifyFirebaseToken, dormitoryController.getUserMembershipRequests);
router.put("/select", verifyFirebaseToken, dormitoryController.selectCurrentDormitory);

// ไม่ใช้แล้ว - ระบบใหม่ไม่มี advanced features ยัง
router.get("/filter", dormitoryController.advancedFilter);
router.get("/rating-filter", dormitoryController.filterByRating);
router.get("/map/all", dormitoryController.getAllDormitoriesForMap);
router.get("/map/popup/:dormId", dormitoryController.getDormitoryForMapPopup);
router.get("/compare", dormitoryController.compareDormitories);
router.get("/amenities/all", dormitoryController.getAllAmenities);
router.get("/room-types/options", dormitoryController.getRoomTypeOptions);
router.get("/:dormId/member-count", dormitoryController.getDormitoryMemberCount);

// ไม่ใช้แล้ว - ระบบใหม่ไม่มี tenant management
router.get("/owner/tenants", verifyFirebaseToken, dormitoryController.getAllOwnerTenants);
router.put("/:dormId/tenants/:userId/approve", verifyFirebaseToken, dormitoryController.approveTenant);
router.put("/:dormId/tenants/:userId/reject", verifyFirebaseToken, dormitoryController.rejectTenant);
router.put("/:dormId/tenants/:userId/cancel", verifyFirebaseToken, dormitoryController.cancelTenantApproval);
*/

module.exports = router;
