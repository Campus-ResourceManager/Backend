const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
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

    block: {
      type: String,
      default: null // only for classrooms
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

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resource", resourceSchema);