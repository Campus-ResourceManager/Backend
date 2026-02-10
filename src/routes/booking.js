/**
 * Booking Routes
 * 
 * MODULES 2, 3, 4 - HALL BOOKING MANAGEMENT
 * 
 * This file defines all API routes related to hall booking operations.
 * Routes are separated by role:
 * - Coordinator routes: Create and view own bookings, check availability
 * - Admin routes: View all bookings, approve/reject requests
 * 
 * Base URL: /api/bookings
 */

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

// ===== COORDINATOR ROUTES =====

/**
 * Create new booking request
 * POST /api/bookings
 * Requires: Coordinator role
 * Body: {
 *   facultyName, facultyDepartment, facultyEmail,
 *   eventTitle, eventDescription, eventCategory,
 *   expectedAttendance, hall, date, startTime, endTime
 * }
 * 
 * MODULE 2: Creates booking with faculty and event details
 * MODULE 3: Calculates priority, checks conflicts, suggests alternatives
 * MODULE 4: Submits for approval with status="pending"
 */
router.post("/", requireAuth, requireRole("coordinator"), createBooking);

/**
 * Get coordinator's own booking requests
 * GET /api/bookings/my
 * Requires: Coordinator role
 * 
 * MODULE 4.3: Status tracking - view all own bookings and their status
 */
router.get("/my", requireAuth, requireRole("coordinator"), getMyBookings);

/**
 * Get hall availability
 * GET /api/bookings/availability
 * Requires: Coordinator role
 * Returns all approved and pending bookings for availability checking
 * 
 * MODULE 3.1: Helps coordinators check availability before creating booking
 */
router.get("/availability", requireAuth, requireRole("coordinator"), getAvailability);

// ===== ADMIN ROUTES =====

/**
 * Get all pending booking requests
 * GET /api/bookings/pending
 * Requires: Admin role
 * Returns bookings with status="pending" awaiting approval
 * 
 * MODULE 4.2: Admin reviews pending requests
 */
router.get("/pending", requireAuth, requireRole("admin"), getPendingBookings);

/**
 * Get all bookings (any status)
 * GET /api/bookings
 * Requires: Admin role
 * Returns all bookings for management and reporting
 */
router.get("/", requireAuth, requireRole("admin"), getAllBookings);

/**
 * Approve a booking request
 * PATCH /api/bookings/:id/approve
 * Requires: Admin role
 * Params: id (booking ID)
 * Body: { remarks } (optional)
 * 
 * MODULE 4.2: Admin approves booking
 * MODULE 4.3: Creates approval log entry
 * MODULE 3.2: If override booking, rejects conflicting booking
 */
router.patch("/:id/approve", requireAuth, requireRole("admin"), approveBooking);

/**
 * Reject a booking request
 * PATCH /api/bookings/:id/reject
 * Requires: Admin role
 * Params: id (booking ID)
 * Body: { reason } (optional)
 * 
 * MODULE 4.2: Admin rejects booking
 * MODULE 4.3: Creates rejection log entry
 */
router.patch("/:id/reject", requireAuth, requireRole("admin"), rejectBooking);

module.exports = router;
