/**
 * Booking Routes
 * 
 * Defines endpoints for resource reservations, availability checks, 
 * and administration of the booking queue.
 */

const express = require("express");
const {
  createBooking,
  getMyBookings,
  getAvailability,
  getPendingBookings,
  getAllBookings,
  approveBooking,
  rejectBooking,
  getFacultyProfile,
  getFairnessStats
} = require("../controllers/bookingController");

const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

/**
 * Coordinator Endpoints
 * 
 * Functionality primarily used by staff to manage their requests.
 */
router.post("/", requireAuth, requireRole("coordinator"), createBooking);
router.get("/my", requireAuth, requireRole("coordinator"), getMyBookings);
router.get("/availability", requireAuth, requireRole("coordinator"), getAvailability);
router.get("/faculty/:email", requireAuth, requireRole("coordinator"), getFacultyProfile);
router.get("/fairness-stats", requireAuth, requireRole("coordinator"), getFairnessStats);

/**
 * Admin Endpoints
 * 
 * Higher-level oversight and decision-making endpoints.
 */
router.get("/pending", requireAuth, requireRole("admin"), getPendingBookings);
router.get("/", requireAuth, requireRole("admin"), getAllBookings);
router.patch("/:id/approve", requireAuth, requireRole("admin"), approveBooking);
router.patch("/:id/reject", requireAuth, requireRole("admin"), rejectBooking);

module.exports = router;


