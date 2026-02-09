const mongoose = require("mongoose");

const approvalLogSchema = new mongoose.Schema(
    {
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            required: true
        },
        action: {
            type: String,
            enum: ["Approved", "Rejected", "Override"],
            required: true
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        previousStatus: {
            type: String,
            required: true
        },
        newStatus: {
            type: String,
            required: true
        },
        remarks: {
            type: String,
            default: ""
        },
        snapshot: {
            priorityScore: Number,
            eventCategory: String,
            conflictDetails: Object
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("ApprovalLog", approvalLogSchema);
