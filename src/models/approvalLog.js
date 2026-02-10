/**
 * Approval Log Model
 * 
 * MODULE 4.3 - APPROVAL LOGS & STATUS TRACKING
 * 
 * This model maintains a complete audit trail of all booking approval decisions.
 * Every time an admin approves or rejects a booking, a log entry is created.
 * 
 * Purpose:
 * - Transparency: Track who made what decision and when
 * - Accountability: Maintain record of all approval actions
 * - Audit: Enable review of approval history for any booking
 * - Analytics: Analyze approval patterns and decision-making
 * 
 * Each log entry captures:
 * - What action was taken (Approved/Rejected/Override)
 * - Who performed the action (admin user)
 * - When it was performed (timestamp)
 * - Why it was done (remarks)
 * - Snapshot of booking state at that time
 */

const mongoose = require("mongoose");

const approvalLogSchema = new mongoose.Schema(
    {
        // Reference to the booking this log entry is about
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",  // Links to Booking model
            required: true
        },

        // Action taken by the admin
        // Approved: Booking was approved
        // Rejected: Booking was rejected
        // Override: Higher priority booking overrode this one
        action: {
            type: String,
            enum: ["Approved", "Rejected", "Override"],
            required: true
        },

        // Reference to the admin who performed this action
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",  // Links to User model (admin)
            required: true
        },

        // Status before this action was taken
        // Example: "pending" before approval
        previousStatus: {
            type: String,
            required: true
        },

        // Status after this action was taken
        // Example: "approved" after approval
        newStatus: {
            type: String,
            required: true
        },

        // Optional remarks or reason provided by admin
        // Example: "Approved for department seminar" or "Rejected due to low priority"
        remarks: {
            type: String,
            default: ""
        },

        // Snapshot of booking details at the time of this action
        // Preserves priority score and category for historical reference
        // Useful for understanding why a decision was made
        snapshot: {
            priorityScore: Number,      // Priority score at time of action
            eventCategory: String,      // Event category at time of action
            conflictDetails: Object     // Any conflict information
        }
    },
    {
        // Automatically add createdAt and updatedAt timestamps
        // createdAt is especially important as it records when the action occurred
        timestamps: true
    }
);

// Export the model for use in controllers
module.exports = mongoose.model("ApprovalLog", approvalLogSchema);
