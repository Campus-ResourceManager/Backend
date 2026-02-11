const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false // Null for unauthenticated actions if any (though usually logged for req.session.user)
        },
        username: String, // Cached for quick display
        action: {
            type: String,
            required: true
        },
        targetType: String, // 'User', 'Booking'
        targetId: mongoose.Schema.Types.ObjectId,
        details: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
