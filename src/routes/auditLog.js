const express = require("express");
const router = express.Router();
const { getAuditLogs, getAuditUsernames } = require("../controllers/auditLogController");

// Basic middleware to ensure admin (should ideally be a separate module, but reusing logic for now)
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === "admin") {
        next();
    } else {
        res.status(403).json({ message: "Access denied" });
    }
};

router.get("/usernames", isAdmin, getAuditUsernames);
router.get("/", isAdmin, getAuditLogs);

module.exports = router;
