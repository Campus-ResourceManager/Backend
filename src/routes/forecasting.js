const express = require("express");
const { getDemandForecast } = require("../controllers/forecastingController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

// Admin can view demand forecasts
router.get("/demand", requireAuth, requireRole("admin"), getDemandForecast);

module.exports = router;
