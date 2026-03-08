/**
 * Faculty Profile Model
 * 
 * Tracks credit usage and fairness metrics for individual faculty members.
 * Profiles are automatically created upon the first booking request by a faculty.
 */

const mongoose = require("mongoose");

const facultyProfileSchema = new mongoose.Schema(
    {
        // Unique identifier linked to their institutional email
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        department: {
            type: String,
            trim: true
        },
        // Maximum allowed credits per month (default: 20)
        monthlyQuota: {
            type: Number,
            default: 20
        },
        // Dynamic score from 0-100 indicating booking priority.
        // Decreases when monthly quota is exceeded.
        priorityScore: {
            type: Number,
            default: 100
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("FacultyProfile", facultyProfileSchema);

