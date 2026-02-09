const express = require("express");
const router = express.Router();
const {
    getAllFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility
} = require("../controllers/facilityController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

// Public (Authenticated) Routes
router.get("/", requireAuth, getAllFacilities);
router.get("/:id", requireAuth, getFacilityById);

// Admin Only Routes
router.post("/", requireAuth, requireRole(["admin"]), createFacility);
router.patch("/:id", requireAuth, requireRole(["admin"]), updateFacility);
router.delete("/:id", requireAuth, requireRole(["admin"]), deleteFacility);

module.exports = router;
