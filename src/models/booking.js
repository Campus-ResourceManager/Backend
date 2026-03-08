/**
 * Booking Model
 * 
 * Represents a resource reservation request in the system.
 * Includes details about the coordinator, faculty, resource, and status.
 */

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // The coordinator (staff/user) who initiated the booking request
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    // Faculty details for whom the booking is made
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
    // Event specific metadata
    eventTitle: {
      type: String,
      required: true,
      trim: true
    },
    eventDescription: {
      type: String,
      trim: true
    },
    // Reference to the hall or classroom being booked
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: true
    },
    // Time window for the booking
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    // Current lifecycle state of the booking
    status: {
      type: String,
      enum: [
        "pending",              // Awaiting admin approval
        "approved",             // Confirmed booking
        "rejected",             // Denied by admin
        "reallocation_pending"  // Displaced by an override, awaiting alternative selection
      ],
      default: "pending"
    },
    // Admin feedback if requested
    rejectionReason: {
      type: String,
      default: ""
    },
    // Flag if this booking was created as an override request
    isConflict: {
      type: Boolean,
      default: false
    },
    conflictReason: {
      type: String,
      default: ""
    },
    // If this booking overrode another, this links to the displaced booking
    overriddenBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null
    },
    // Snapshot of the faculty priority score at the moment this booking was handled
    priorityScoreAtBooking: {
      type: Number,
      default: 100
    }

  },
  {
    timestamps: true // Automatically adds createdAt and updatedAt fields
  }
);

// Index to optimize availability queries (overlap checks)
bookingSchema.index({ resource: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model("Booking", bookingSchema);


