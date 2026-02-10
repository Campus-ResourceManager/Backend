/**
 * Authentication Routes
 * 
 * MODULE 1 - USER IDENTIFICATION & AUTHENTICATION
 * 
 * This file defines all API routes related to user authentication and management.
 * Routes are organized into three categories:
 * 1. Public routes (no authentication required)
 * 2. Authenticated routes (login required)
 * 3. Admin-only routes (admin role required)
 * 
 * Base URL: /api/auth
 */

const express = require("express");
const { registerUser,
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

// ===== PUBLIC ROUTES (No authentication required) =====

/**
 * Login route
 * POST /api/auth/login
 * Body: { username, password, role }
 */
router.post("/login", loginUser);

/**
 * Admin registration request (public)
 * POST /api/auth/admin/request
 * Body: { username, password, role: "admin" }
 * Note: Creates admin account with status="disabled" (awaiting approval)
 */
router.post("/admin/request", registerUser);

/**
 * Get current user info
 * GET /api/auth/me
 * Returns user data if session exists, null otherwise
 */
router.get("/me", getMe);

// ===== AUTHENTICATED ROUTES (Login required) =====

/**
 * Logout route
 * POST /api/auth/logout
 * Requires: Authentication
 * Destroys session and logs out user
 */
router.post("/logout", requireAuth, logoutUser);

// ===== ADMIN-ONLY ROUTES (Admin role required) =====

/**
 * Register new coordinator
 * POST /api/auth/register
 * Requires: Admin role
 * Body: { username, password, role: "coordinator" }
 */
router.post("/register", requireAuth, requireRole("admin"), registerUser);

/**
 * Get all coordinators
 * GET /api/auth/coordinators
 * Requires: Admin role
 */
router.get("/coordinators", requireAuth, requireRole("admin"), getCoordinators);

/**
 * Delete a coordinator
 * DELETE /api/auth/coordinator/:id
 * Requires: Admin role
 * Params: id (coordinator user ID)
 */
router.delete("/coordinator/:id", requireAuth, requireRole("admin"), deleteCoordinator);

/**
 * Get all active admins
 * GET /api/auth/admin/active
 * Requires: Admin role
 */
router.get("/admin/active", requireAuth, requireRole("admin"), getActiveAdmins);

/**
 * Get pending admin requests
 * GET /api/auth/admin/pending
 * Requires: Admin role
 * Returns admins with status="disabled" awaiting approval
 */
router.get("/admin/pending", requireAuth, requireRole("admin"), getPendingAdmins);

/**
 * Approve admin request
 * PATCH /api/auth/admin/:id/approve
 * Requires: Admin role
 * Params: id (admin user ID)
 * Changes status from "disabled" to "active"
 */
router.patch("/admin/:id/approve", requireAuth, requireRole("admin"), approveAdmin);

/**
 * Reject admin request
 * DELETE /api/auth/admin/:id/reject
 * Requires: Admin role
 * Params: id (admin user ID)
 * Deletes the admin request
 */
router.delete("/admin/:id/reject", requireAuth, requireRole("admin"), rejectAdmin);

/**
 * Disable an active admin
 * PATCH /api/auth/admin/:id/disable
 * Requires: Admin role
 * Params: id (admin user ID)
 * Changes status from "active" to "disabled"
 */
router.patch("/admin/:id/disable", requireAuth, requireRole("admin"), disableAdmin);

/**
 * Permanently remove an admin
 * DELETE /api/auth/admin/:id/remove
 * Requires: Admin role
 * Params: id (admin user ID)
 * Deletes admin from database
 */
router.delete("/admin/:id/remove", requireAuth, requireRole("admin"), removeAdmin);

module.exports = router;
