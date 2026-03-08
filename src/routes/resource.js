/**
 * Resource Inventory Routes
 * 
 * Provides endpoints to list halls/classrooms and check their availability
 * across specific time windows.
 */

const express = require("express");
const { getResources, checkResourceAvailability, getBulkAvailability } = require("../controllers/resourceController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

// List all active halls/classrooms
router.get(
  "/",
  requireAuth,
  requireRole("coordinator"),
  getResources
);

// Check if a single hall is free
router.get(
  "/:id/availability",
  requireAuth,
  requireRole("coordinator"),
  checkResourceAvailability
);

// Check availability for all halls (used for filtering in New Booking page)
router.get(
  "/availability/bulk",
  requireAuth,
  requireRole("coordinator"),
  getBulkAvailability
);

module.exports = router;
