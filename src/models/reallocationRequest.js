const mongoose = require("mongoose");

const reallocationRequestSchema = new mongoose.Schema(
{
  displacedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true
  },

  coordinator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  suggestedHall: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resource",
    required: true
  },

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