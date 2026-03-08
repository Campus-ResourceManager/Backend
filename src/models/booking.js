const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    facultyName: {
      type: String,
      required: true,
      trim: true
    },
    facultyDepartment: {
      type: String,
      trim: true
    },
    facultyDesignation: {
      type: String,
      trim: true
    },
    facultyEmail: {
      type: String,
      trim: true
    },
    eventTitle: {
      type: String,
      required: true,
      trim: true
    },
    eventDescription: {
      type: String,
      trim: true
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "reallocation_pending"
      ],
      default: "pending"
    },
    rejectionReason: {
      type: String,
      default: ""
    },
    isConflict: {
      type: Boolean,
      default: false
    },
    conflictReason: {
      type: String,
      default: ""
    },
    overriddenBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null
    },
    priorityScoreAtBooking: {
      type: Number,
      default: 100
    }

  },
  {
    timestamps: true
  }
);

// Simple index to speed up availability checks per hall and time window
bookingSchema.index({ resource: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model("Booking", bookingSchema);

