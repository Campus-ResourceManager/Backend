const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["coordinator", "admin"],
      required: true
    },
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