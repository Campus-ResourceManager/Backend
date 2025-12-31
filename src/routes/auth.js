const express = require("express");
const { loginUser, getMe } = require("../controllers/authController")
const router = express.Router();

router.post("/login", loginUser);
router.get("/me", getMe);


module.exports = router;