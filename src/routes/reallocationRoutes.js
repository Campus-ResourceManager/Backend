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

router.post(
  "/send",
  requireAuth,
  requireRole("admin"),
  sendSuggestion
);

router.patch(
  "/accept/:id",
  requireAuth,
  requireRole("coordinator"),
  acceptSuggestion
);

router.patch(
  "/reject/:id",
  requireAuth,
  requireRole("coordinator"),
  rejectSuggestion
);

router.get(
  "/my",
  requireAuth,
  requireRole("coordinator"),
  getMyReallocationRequests
);

module.exports = router;