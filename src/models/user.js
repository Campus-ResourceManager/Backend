/**
 * User Model
 * 
 * MODULE 1 - USER IDENTIFICATION & AUTHENTICATION
 * 
 * This model defines the schema for user accounts in the system.
 * Users can have two roles: coordinator or admin.
 * 
 * User Types:
 * - Coordinator: Student coordinators who create booking requests
 * - Admin: Administrators who approve/reject booking requests and manage users
 * 
 * Status Values:
 * - active: User can log in and access the system
 * - disabled: User account is locked (used for pending admin approvals)
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Unique username for login
    username: {
      type: String,
      required: true,
      unique: true,  // No two users can have the same username
      trim: true     // Remove whitespace from beginning and end
    },

    // Hashed password (never stored in plain text)
    // Hashed using bcrypt with 10 salt rounds in authController
    password: {
      type: String,
      required: true
    },

    // User role determines access permissions
    // coordinator: Can create booking requests
    // admin: Can approve/reject bookings and manage users
    role: {
      type: String,
      enum: ["coordinator", "admin"],  // Only these two values allowed
      required: true
    },

    // Account status
    // active: User can log in
    // disabled: User cannot log in (used for pending admin approvals)
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active"  // Coordinators are active by default, admins start disabled
    }
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true
  }
);

// Export the model for use in controllers
module.exports = mongoose.model("User", userSchema);