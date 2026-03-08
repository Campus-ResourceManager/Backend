/**
 * Reallocation Routes
 * 
 * Handles the workflow for managing displaced bookings after an override.
 */

const express = require("express");

const {
  sendSuggestion,
  acceptSuggestion,
  rejectSuggestion,
  getMyReallocationRequests
} = require("../controllers/reallocationController");

const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

/**
 * Admin Action: Initiate a suggestion for a user who was bumped.
 */
router.post(
  "/send",
  requireAuth,
  requireRole("admin"),
  sendSuggestion
);

/**
 * Coordinator Actions: Review and react to suggestions for their bookings.
 */

// Confirm and move to the suggested hall
router.patch(
  "/accept/:id",
  requireAuth,
  requireRole("coordinator"),
  acceptSuggestion
);

// Decline the suggestion
router.patch(
  "/reject/:id",
  requireAuth,
  requireRole("coordinator"),
  rejectSuggestion
);

// View pending suggestions
router.get(
  "/my",
  requireAuth,
  requireRole("coordinator"),
  getMyReallocationRequests
);

module.exports = router;
