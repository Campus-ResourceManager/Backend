const express = require("express");
const { registerUser, loginUser, logoutUser ,getMe } = require("../controllers/authController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const router = express.Router();

router.post("/login", loginUser);
router.post("/register", requireAuth, requireRole("admin"), registerUser);
router.post("/logout", requireAuth, logoutUser);
router.get("/me", requireAuth, getMe);

module.exports = router;