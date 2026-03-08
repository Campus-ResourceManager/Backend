const mongoose = require("mongoose");

const facultyProfileSchema = new mongoose.Schema(
    {
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
        monthlyQuota: {
            type: Number,
            default: 20
        },
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
