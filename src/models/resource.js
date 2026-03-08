/**
 * Resource Model
 * 
 * Represents a physical asset that can be booked (Halls, Classrooms).
 */

const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    // Unique display name (e.g., 'Main Auditorium')
    name: {
      type: String,
      required: true,
      unique: true
    },

    type: {
      type: String,
      enum: ["hall", "classroom"],
      required: true
    },

    // Administrative hierarchy for campus organization
    block: {
      type: String,
      default: null
    },

    wing: {
      type: String,
      enum: ["A", "B", "C", "D"],
      default: null
    },

    floor: {
      type: Number,
      default: null
    },

    capacity: {
      type: Number,
      required: true
    },

    // Used to temporarily decommission a resource
    isActive: {
      type: Boolean,
      default: true
    },

    // The 'cost' in credits to book this resource for a standard session
    creditCost: {
      type: Number,
      default: 1
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resource", resourceSchema);
