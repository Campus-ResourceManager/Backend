const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        capacity: {
            type: Number,
            required: true,
            min: 1
        },
        features: {
            type: [String], // e.g., ["Projector", "AC", "Whiteboard"]
            default: []
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Room", roomSchema);
