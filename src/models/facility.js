const mongoose = require("mongoose");

const facilitySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        location: {
            type: String, // e.g., "Block A", "Science Wing"
            required: true,
            trim: true
        },
        capacity: {
            type: Number,
            required: true,
            min: 1
        },
        equipment: [
            {
                type: String, // e.g., "Projector", "Sound System", "Whiteboard"
            }
        ],
        status: {
            type: String,
            enum: ["Active", "Maintenance", "Inactive"],
            default: "Active"
        },
        description: {
            type: String,
            trim: true
        },
        imageUrl: {
            type: String // Optional: URL to facility image
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Facility", facilitySchema);
