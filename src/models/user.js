/**
 * User Model
 * 
 * Represents an authenticated entity in the system (Admins, Coordinators).
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    // Hashed password 
    password: {
      type: String,
      required: true
    },
    // Roles define access control across the app
    role: {
      type: String,
      enum: ["coordinator", "admin"],
      required: true
    },
    // Accounts can be flagged for approval (admin) or deactivated
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
