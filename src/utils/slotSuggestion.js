/**
 * MODULE 3.3 - Alternative Slot Suggestion System
 * 
 * When a booking conflict is detected, this utility suggests alternative
 * available time slots to help coordinators quickly reschedule their event.
 * 
 * SUGGESTION STRATEGY:
 * 
 * 1. Same Hall, Different Dates (Priority 1):
 *    - Check ±2 days from requested date
 *    - Same time slot
 *    - Helps maintain venue preference
 * 
 * 2. Different Halls, Same Date & Time (Priority 2):
 *    - Check other available halls
 *    - Same date and time
 *    - Helps maintain schedule preference
 * 
 * Returns up to 5 alternative suggestions ranked by relevance.
 */

const Booking = require("../models/booking");

/**
 * List of all available halls in the institution
 * 
 * In a production system, this should be fetched from a Facility database model.
 * For now, we maintain a static list of common halls.
 */
const ALL_HALLS = [
    "A-191", "A-192", "A-193", "A-194", "A-195",
    "A-205", "A-206", "A-207", "A-208",
    "Seminar Hall", "Auditorium", "Conference Room 1", "Conference Room 2"
];

/**
 * Find alternative available slots for a requested booking
 * 
 * Algorithm:
 * 1. Calculate event duration from requested time slot
 * 2. Check same hall on nearby dates (±2 days)
 * 3. Check other halls at same date and time
 * 4. Filter out past dates
 * 5. Return top 5 suggestions
 * 
 * @param {String} hall - Requested hall name
 * @param {String} dateStr - Requested date in YYYY-MM-DD format
 * @param {String} startTimeStr - Start time in HH:MM format
 * @param {String} endTimeStr - End time in HH:MM format
 * @returns {Array} List of alternative slot objects with hall, startTime, endTime, reason
 */
const findAlternativeSlots = async (hall, dateStr, startTimeStr, endTimeStr) => {
    const alternatives = [];

    // Parse requested date and time
    const startDateTime = new Date(`${dateStr}T${startTimeStr}`);
    const endDateTime = new Date(`${dateStr}T${endTimeStr}`);

    // Calculate event duration in milliseconds
    const durationMs = endDateTime - startDateTime;

    // STRATEGY 1: Check Same Hall, Different Dates (±2 Days)
    // This helps coordinators keep their preferred venue
    const datesToCheck = [];

    // Generate list of dates to check (next 2 days and previous 2 days)
    for (let i = 1; i <= 2; i++) {
        // Check future dates
        const nextDay = new Date(startDateTime);
        nextDay.setDate(startDateTime.getDate() + i);
        datesToCheck.push(nextDay);

        // Check past dates (but only if they're not in the past)
        const prevDay = new Date(startDateTime);
        prevDay.setDate(startDateTime.getDate() - i);
        if (prevDay >= new Date()) {  // Don't suggest past dates
            datesToCheck.push(prevDay);
        }
    }

    // Check each alternative date for availability
    for (const checkDate of datesToCheck) {
        const checkStart = checkDate;
        const checkEnd = new Date(checkDate.getTime() + durationMs);

        // Query database to see if this slot is available
        const isConflict = await Booking.exists({
            hall,
            status: { $in: ["pending", "approved"] },
            $or: [
                {
                    startTime: { $lt: checkEnd },
                    endTime: { $gt: checkStart }
                }
            ]
        });

        // If no conflict, add to alternatives
        if (!isConflict) {
            alternatives.push({
                hall,
                startTime: checkStart,
                endTime: checkEnd,
                reason: `Available on ${checkStart.toLocaleDateString()}`
            });
        }
    }

    // STRATEGY 2: Check Other Halls, Same Date & Time
    // This helps coordinators keep their preferred schedule
    const otherHalls = ALL_HALLS.filter(h => h !== hall);

    // Optimization: Find all halls that are busy during the requested time slot
    // This is more efficient than checking each hall individually
    const busyHallsInSlot = await Booking.distinct("hall", {
        status: { $in: ["pending", "approved"] },
        startTime: { $lt: endDateTime },
        endTime: { $gt: startDateTime }
    });

    // Find halls that are NOT in the busy list (i.e., available)
    const availableHalls = otherHalls.filter(h => !busyHallsInSlot.includes(h));

    // Add up to 3 alternative halls to suggestions
    availableHalls.slice(0, 3).forEach(availHall => {
        alternatives.push({
            hall: availHall,
            startTime: startDateTime,
            endTime: endDateTime,
            reason: `Available in ${availHall} at requested time`
        });
    });

    // Return top 5 suggestions
    // Suggestions are ordered by strategy priority:
    // 1. Same hall, different dates (most preferred)
    // 2. Different halls, same time (less preferred)
    return alternatives.slice(0, 5);
};

// Export function for use in booking controller
module.exports = {
    findAlternativeSlots
};
