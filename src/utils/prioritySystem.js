/**
 * Priority System for Hall Booking
 *
 * Scoring Rules:
 * 1. Event Category (Base Score):
 *    - Institutional: 100
 *    - Departmental: 50
 *    - Student: 20
 *    - Other: 10
 *
 * 2. Advance Booking (Bonus):
 *    - +5 points per week of advance notice (max 25 points)
 *
 * 3. Attendance (Bonus):
 *    - +1 point per 10 expected attendees (max 20 points)
 */

const calculatePriorityScore = (eventCategory, bookingDate, eventDate, expectedAttendance) => {
    let categoryScore = 0;

    switch (eventCategory) {
        case "Institutional":
            categoryScore = 100;
            break;
        case "Departmental":
            categoryScore = 50;
            break;
        case "Student":
            categoryScore = 20;
            break;
        default:
            categoryScore = 10;
    }

    // Calculate advance booking weeks
    const now = new Date();
    const event = new Date(eventDate);
    const diffTime = Math.abs(event - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeksAdvance = Math.floor(diffDays / 7);

    // Cap advance booking bonus at 25 points (5 weeks)
    const advanceBookingScore = Math.min(weeksAdvance * 5, 25);

    // Calculate attendance bonus (capped at 20 points for 200+ people)
    const attendance = expectedAttendance || 0;
    const attendanceScore = Math.min(Math.floor(attendance / 10), 20);

    const totalScore = categoryScore + advanceBookingScore + attendanceScore;

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
 * Compare two bookings and generate a recommendation
 * @param {Object} newBooking - The incoming booking request
 * @param {Object} existingBooking - The booking already occupying the slot
 * @returns {Object} Recommendation with reason
 */
const compareBookings = (newBooking, existingBooking) => {
    const scoreDiff = newBooking.priorityScore - existingBooking.priorityScore;

    if (scoreDiff > 30) {
        return {
            recommendation: "Strongly Approve New",
            reason: `New request has significantly higher priority (${newBooking.priorityScore} vs ${existingBooking.priorityScore}).`,
            shouldOverride: true
        };
    } else if (scoreDiff > 0) {
        return {
            recommendation: "Approve New (Review Required)",
            reason: `New request has slightly higher priority (${newBooking.priorityScore} vs ${existingBooking.priorityScore}).`,
            shouldOverride: false
        };
    } else {
        return {
            recommendation: "Reject New",
            reason: `Existing booking has higher or equal priority (${existingBooking.priorityScore} vs ${newBooking.priorityScore}).`,
            shouldOverride: false
        };
    }
};

module.exports = {
    calculatePriorityScore,
    compareBookings
};
