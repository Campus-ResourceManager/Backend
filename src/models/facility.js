/**
 * Facility Model
 * 
 * MODULE 2.2 - SELECT FACILITY (HALL/ROOM)
 * 
 * This model defines the schema for halls and facilities available for booking.
 * It stores information about each venue including location, capacity, and equipment.
 * 
 * Purpose:
 * - Catalog all available halls and rooms
 * - Track facility details (capacity, equipment, location)
 * - Manage facility status (active, maintenance, inactive)
 * - Help coordinators choose appropriate venues
 * 
 * Note: In the current implementation, facilities are referenced by name string
 * in bookings. This model provides a foundation for future enhancements like:
 * - Filtering halls by capacity or equipment
 * - Showing facility details during booking
 * - Managing facility availability and maintenance schedules
 */

const mongoose = require("mongoose");

const facilitySchema = new mongoose.Schema(
    {
        // Unique name of the hall/facility
        // Examples: "A-191", "Seminar Hall", "Auditorium"
        name: {
            type: String,
            required: true,
            unique: true,  // No two facilities can have the same name
            trim: true
        },

        // Physical location of the facility
        // Examples: "Block A", "Science Wing", "Main Building"
        location: {
            type: String,
            required: true,
            trim: true
        },

        // Seating capacity (number of people)
        // Helps coordinators choose appropriate venue for event size
        capacity: {
            type: Number,
            required: true,
            min: 1  // Must have at least 1 seat
        },

        // List of equipment available in this facility
        // Examples: ["Projector", "Sound System", "Whiteboard", "Air Conditioning"]
        // Helps coordinators ensure venue has required equipment
        equipment: [
            {
                type: String
            }
        ],

        // Current status of the facility
        // Active: Available for booking
        // Maintenance: Temporarily unavailable (under repair/renovation)
        // Inactive: Permanently unavailable (decommissioned)
        status: {
            type: String,
            enum: ["Active", "Maintenance", "Inactive"],
            default: "Active"
        },

        // Optional description of the facility
        // Can include special features, access instructions, etc.
        description: {
            type: String,
            trim: true
        },

        // Optional URL to facility image
        // Can be used to show preview of the venue
        imageUrl: {
            type: String
        }
    },
    {
        // Automatically add createdAt and updatedAt timestamps
        timestamps: true
    }
);

// Export the model for use in controllers
module.exports = mongoose.model("Facility", facilitySchema);
