/**
 * Authentication & User Management Routes
 * 
 * Defines endpoints for login, registration, and administrative user control.
 */

const express = require("express");
const {
        registerUser,
        loginUser,
        logoutUser,
        getMe,
        getPendingAdmins,
        approveAdmin,
        rejectAdmin,
        disableAdmin,
        removeAdmin,
        getCoordinators,
        deleteCoordinator,
        getActiveAdmins
} = require("../controllers/authController");

const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const router = express.Router();

/**
 * Public Routes
 */
router.post("/login", loginUser);

// Allow anyone to request an admin account (starts in 'disabled' state)
router.post("/admin/request", registerUser);

/**
 * Protected Routes (Logged-in users only)
 */
router.post("/logout", requireAuth, logoutUser);
router.get("/me", requireAuth, getMe);

/**
 * Admin-Only Routes
 * 
 * These require both a valid session and the 'admin' role.
 */

// Coordinator Management
router.get("/coordinators", requireAuth, requireRole("admin"), getCoordinators);
router.delete("/coordinator/:id", requireAuth, requireRole("admin"), deleteCoordinator);

// Admin Account Management
router.get("/admin/active", requireAuth, requireRole("admin"), getActiveAdmins);
router.get("/admin/pending", requireAuth, requireRole("admin"), getPendingAdmins);
router.patch("/admin/:id/approve", requireAuth, requireRole("admin"), approveAdmin);
router.delete("/admin/:id/reject", requireAuth, requireRole("admin"), rejectAdmin);
router.patch("/admin/:id/disable", requireAuth, requireRole("admin"), disableAdmin);
router.delete("/admin/:id/remove", requireAuth, requireRole("admin"), removeAdmin);

module.exports = router;


