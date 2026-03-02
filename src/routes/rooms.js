const express = require("express");
const { getRooms, getAllRooms, createRoom, updateRoom, deleteRoom, seedRooms } = require("../controllers/roomController");
const requireAuth = require("../middlewares/requireAuth");

const router = express.Router();

// Get active rooms (used by coordinators for booking)
router.get("/", requireAuth, getRooms);

// Get ALL rooms including inactive (admin management)
router.get("/all", requireAuth, getAllRooms);

// Create room (admin)
router.post("/", requireAuth, createRoom);

// Update room (admin)
router.patch("/:id", requireAuth, updateRoom);

// Delete room permanently (admin)
router.delete("/:id", requireAuth, deleteRoom);

// Seed rooms (dev/admin helper)
router.post("/seed", seedRooms);

module.exports = router;

