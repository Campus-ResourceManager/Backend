const AuditLog = require("../models/AuditLog");

const getAuditLogs = async (req, res) => {
    try {
        const { username, action, startDate, endDate } = req.query;
        let query = {};

        if (username && username !== 'ALL') {
            // Exact match when selecting from dropdown
            query.username = username;
        }

        if (action && action !== 'ALL') {
            query.action = action; // Exact match for dropdown
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Set end date to end of day
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const logs = await AuditLog.find(query)
            .populate("user", "username role")
            .sort({ createdAt: -1 })
            .limit(500);

        res.status(200).json(logs);
    } catch (error) {
        console.error("Error fetching audit logs:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/audit-logs/usernames - Get all distinct usernames for dropdown
const getAuditUsernames = async (req, res) => {
    try {
        const usernames = await AuditLog.distinct('username');
        res.status(200).json(usernames.filter(Boolean).sort());
    } catch (error) {
        console.error("Error fetching usernames:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const createLog = async (userId, username, action, targetType, targetId, details) => {
    try {
        await AuditLog.create({
            user: userId,
            username,
            action,
            targetType,
            targetId,
            details
        });
    } catch (error) {
        console.error("Error creating audit log:", error);
    }
};

module.exports = {
    getAuditLogs,
    getAuditUsernames,
    createLog
};
