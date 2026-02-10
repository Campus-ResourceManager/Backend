/**
 * Booking Model
 * 
 * MODULES 2, 3, 4 - HALL BOOKING MANAGEMENT
 * 
 * This model defines the schema for hall booking requests.
 * It stores all information about a booking including:
 * - Faculty and event details (MODULE 2)
 * - Priority scores and conflict information (MODULE 3)
 * - Approval status and tracking (MODULE 4)
 * 
 * Booking Lifecycle:
 * 1. Created with status "pending" (awaiting approval)
 * 2. Admin reviews and either approves or rejects
 * 3. Status changes to "approved" or "rejected"
 * 4. Approval logs track all status changes
 */

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // Reference to the coordinator who created this booking
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",  // Links to User model
      required: true
    },

    // MODULE 2.1: Faculty & Event Details
    // Name of the faculty member for whom the hall is being booked
    facultyName: {
      type: String,
      required: true,
      trim: true
    },

    // Department of the faculty member
    facultyDepartment: {
      type: String,
      trim: true
    },

    // Contact email for the faculty member
    facultyEmail: {
      type: String,
      trim: true
    },

    // Title of the event (e.g., "Guest Lecture on AI")
    eventTitle: {
      type: String,
      required: true,
      trim: true
    },

    // Detailed description of the event
    eventDescription: {
      type: String,
      trim: true
    },

    // MODULE 3.2: Event category determines priority score
    // Institutional (100 pts) > Departmental (50 pts) > Student (20 pts) > Other (10 pts)
    eventCategory: {
      type: String,
      enum: ["Institutional", "Departmental", "Student", "Other"],
      default: "Student",
      required: true
    },

    // Number of people expected to attend
    // Used in priority calculation (larger events get bonus points)
    expectedAttendance: {
      type: Number,
      default: 0
    },

    // MODULE 3.2: Calculated priority score
    // Higher score = higher priority in case of conflicts
    priorityScore: {
      type: Number,
      default: 0
    },

    // Detailed breakdown of how priority score was calculated
    // Stored for transparency and audit purposes
    priorityDetails: {
      categoryScore: Number,        // Base score from event category
      advanceBookingScore: Number,  // Bonus for booking in advance
      attendanceScore: Number,      // Bonus for larger events
      totalScore: Number            // Sum of all scores
    },

    // MODULE 2.2: Hall/facility name
    hall: {
      type: String,
      required: true,
      trim: true
    },

    // MODULE 2.3: Event start time
    startTime: {
      type: Date,
      required: true
    },

    // MODULE 2.3: Event end time
    endTime: {
      type: Date,
      required: true
    },

    // MODULE 4: Approval status
    // pending: Awaiting admin approval
    // approved: Admin has approved the booking
    // rejected: Admin has rejected the booking
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    // Reason provided by admin when rejecting a booking
    rejectionReason: {
      type: String,
      default: ""
    },

    // MODULE 3.1: Flag indicating if this booking conflicts with another
    isConflict: {
      type: Boolean,
      default: false
    },

    // Reason/justification for requesting override of conflicting booking
    conflictReason: {
      type: String,
      default: ""
    },

    // MODULE 3.2: Reference to the booking that will be overridden
    // If this booking is approved, the referenced booking will be rejected
    overriddenBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null
    },

    // MODULE 3.3: Alternative time slots suggested when conflict detected
    suggestedAlternatives: [
      {
        hall: String,
        startTime: Date,
        endTime: Date,
        reason: String
      }
    ]
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true
  }
);

// Database index for faster queries
// Speeds up availability checks by hall and time window
bookingSchema.index({ hall: 1, startTime: 1, endTime: 1 });

// Export the model for use in controllers
module.exports = mongoose.model("Booking", bookingSchema);
