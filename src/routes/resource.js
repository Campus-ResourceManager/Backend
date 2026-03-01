const express = require("express");
const { getResources, checkResourceAvailability, getBulkAvailability} = require("../controllers/resourceController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  requireRole("coordinator"),
  getResources
);

router.get(
  "/:id/availability",
  requireAuth,
  requireRole("coordinator"),
  checkResourceAvailability
);

router.get(
  "/availability/bulk",
  requireAuth,
  requireRole("coordinator"),
  getBulkAvailability
);

module.exports = router;