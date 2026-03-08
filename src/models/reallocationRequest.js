/**
 * Reallocation Request Model
 * 
 * Stores system-generated suggestions for coordinators when a booking 
 * has been displaced by an administrator-approved override.
 */

const mongoose = require("mongoose");

const reallocationRequestSchema = new mongoose.Schema(
  {
    // Link to the original booking that was displaced
    displacedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    // The coordinator who needs to make the decision
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // The alternative resource suggested by the Reallocation Engine
    suggestedHall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: true
    },

    // State of the suggestion
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "ReallocationRequest",
  reallocationRequestSchema
);
