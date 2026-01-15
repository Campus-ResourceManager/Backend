const express = require("express");
const { loginUser, logoutUser ,getMe } = require("../controllers/authController");
const requireAuth = require("../middlewares/requireAuth");
const router = express.Router();

router.post("/login", loginUser);
router.post("/logout", requireAuth, logoutUser);
router.get("/me", requireAuth, getMe);

module.exports = router;