const express = require("express");
const {
  createBooking,
  getMyBookings,
  getAvailability,
  getPendingBookings,
  getAllBookings,
  approveBooking,
  rejectBooking
} = require("../controllers/bookingController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

// Coordinator creates and views own bookings
router.post("/", requireAuth, requireRole("coordinator"), createBooking);
router.get("/my", requireAuth, requireRole("coordinator"), getMyBookings);
router.get("/availability", requireAuth, requireRole("coordinator"), getAvailability);

// Admin views and manages bookings
router.get("/pending", requireAuth, requireRole("admin"), getPendingBookings);
router.get("/", requireAuth, requireRole("admin"), getAllBookings);
router.patch("/:id/approve", requireAuth, requireRole("admin"), approveBooking);
router.patch("/:id/reject", requireAuth, requireRole("admin"), rejectBooking);

module.exports = router;

