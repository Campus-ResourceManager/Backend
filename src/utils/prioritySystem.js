/**
 * MODULE 3.2 - Priority System for Hall Booking
 * 
 * This utility calculates priority scores for booking requests based on multiple factors.
 * Higher priority bookings can override lower priority bookings when conflicts occur.
 * 
 * PRIORITY SCORING SYSTEM:
 * 
 * 1. Event Category (Base Score):
 *    - Institutional Events: 100 points (highest priority)
 *      Examples: University ceremonies, official meetings, accreditation events
 *    - Departmental Events: 50 points
 *      Examples: Department seminars, faculty meetings, academic conferences
 *    - Student Events: 20 points
 *      Examples: Club activities, student-organized workshops
 *    - Other Events: 10 points (lowest priority)
 *      Examples: Informal gatherings, practice sessions
 *
 * 2. Advance Booking Bonus (encourages early planning):
 *    - +5 points per week of advance notice
 *    - Maximum: 25 points (for bookings 5+ weeks in advance)
 *    - Example: Booking 3 weeks ahead = +15 points
 *
 * 3. Attendance Bonus (prioritizes larger events):
 *    - +1 point per 10 expected attendees
 *    - Maximum: 20 points (for 200+ attendees)
 *    - Example: Event with 150 attendees = +15 points
 * 
 * TOTAL SCORE RANGE: 10 to 145 points
 * 
 * Example Calculations:
 * - Institutional event, 4 weeks advance, 100 attendees: 100 + 20 + 10 = 130 points
 * - Student event, 1 week advance, 50 attendees: 20 + 5 + 5 = 30 points
 */

const Booking = require("../models/booking");

/**
 * Calculate priority score for a booking request
 * 
 * @param {String} eventCategory - Category of event (Institutional, Departmental, Student, Other)
 * @param {Date} bookingDate - Date when booking request was made
 * @param {Date} eventDate - Date when event will occur
 * @param {Number} expectedAttendance - Number of expected attendees
 * @returns {Object} Object containing totalScore and detailed breakdown
 */
const calculatePriorityScore = (eventCategory, bookingDate, eventDate, expectedAttendance) => {
    let categoryScore = 0;

    // 1. Calculate Base Score from Event Category
    switch (eventCategory) {
        case "Institutional":
            categoryScore = 100;  // Highest priority for institutional events
            break;
        case "Departmental":
            categoryScore = 50;   // Medium-high priority for department events
            break;
        case "Student":
            categoryScore = 20;   // Medium-low priority for student events
            break;
        default:
            categoryScore = 10;   // Lowest priority for other events
    }

    // 2. Calculate Advance Booking Bonus
    // Encourages early planning and booking
    const now = new Date();
    const event = new Date(eventDate);
    const diffTime = Math.abs(event - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeksAdvance = Math.floor(diffDays / 7);

    // Cap advance booking bonus at 25 points (5 weeks)
    const advanceBookingScore = Math.min(weeksAdvance * 5, 25);

    // 3. Calculate Attendance Bonus
    // Larger events get higher priority (capped at 20 points for 200+ people)
    const attendance = expectedAttendance || 0;
    const attendanceScore = Math.min(Math.floor(attendance / 10), 20);

    // Calculate total priority score
    const totalScore = categoryScore + advanceBookingScore + attendanceScore;

    // Return score with detailed breakdown for transparency
    return {
        totalScore,
        details: {
            categoryScore,
            advanceBookingScore,
            attendanceScore,
            totalScore
        }
    };
};

/**
 * MODULE 3.2 - Compare two bookings and generate recommendation
 * 
 * This function compares priority scores of two conflicting bookings
 * and provides a recommendation for the admin to make an informed decision.
 * 
 * Decision Thresholds:
 * - Score difference > 30: Strong recommendation to approve new booking
 * - Score difference > 0: Moderate recommendation (admin review required)
 * - Score difference <= 0: Recommend rejecting new booking
 * 
 * @param {Object} newBooking - The incoming booking request with priorityScore
 * @param {Object} existingBooking - The booking already occupying the slot with priorityScore
 * @returns {Object} Recommendation object with decision guidance
 */
const compareBookings = (newBooking, existingBooking) => {
    const scoreDiff = newBooking.priorityScore - existingBooking.priorityScore;

    if (scoreDiff > 30) {
        // New booking has significantly higher priority
        // Example: Institutional event (100) vs Student event (20)
        return {
            recommendation: "Strongly Approve New",
            reason: `New request has significantly higher priority (${newBooking.priorityScore} vs ${existingBooking.priorityScore}).`,
            shouldOverride: true
        };
    } else if (scoreDiff > 0) {
        // New booking has slightly higher priority
        // Admin should review context before deciding
        return {
            recommendation: "Approve New (Review Required)",
            reason: `New request has slightly higher priority (${newBooking.priorityScore} vs ${existingBooking.priorityScore}).`,
            shouldOverride: false
        };
    } else {
        // Existing booking has equal or higher priority
        // Recommend maintaining existing booking
        return {
            recommendation: "Reject New",
            reason: `Existing booking has higher or equal priority (${existingBooking.priorityScore} vs ${newBooking.priorityScore}).`,
            shouldOverride: false
        };
    }
};

// Export functions for use in booking controller
module.exports = {
    calculatePriorityScore,
    compareBookings
};
