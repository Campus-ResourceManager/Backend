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

router.post("/login", loginUser);
// Public admin request (NO auth required)
router.post("/admin/request", registerUser);
router.post("/register", requireAuth, requireRole("admin"), registerUser);
router.post("/logout", requireAuth, logoutUser);
router.get("/me", getMe);
router.get("/coordinators", requireAuth, requireRole("admin"), getCoordinators);
router.delete("/coordinator/:id", requireAuth, requireRole("admin"), deleteCoordinator);
router.get("/admin/active", requireAuth, requireRole("admin"), getActiveAdmins);
router.get("/admin/pending", requireAuth, requireRole("admin"), getPendingAdmins);
router.patch("/admin/:id/approve", requireAuth, requireRole("admin"), approveAdmin);
router.delete("/admin/:id/reject", requireAuth, requireRole("admin"), rejectAdmin);
router.patch("/admin/:id/disable", requireAuth, requireRole("admin"), disableAdmin);
router.delete("/admin/:id/remove", requireAuth, requireRole("admin"), removeAdmin);

module.exports = router;

