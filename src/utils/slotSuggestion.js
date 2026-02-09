const Booking = require("../models/booking");

// Mock list of halls - ideally this should come from a DB model
const ALL_HALLS = [
    "A-191", "A-192", "A-193", "A-194", "A-195",
    "A-205", "A-206", "A-207", "A-208",
    "Seminar Hall", "Auditorium", "Conference Room 1", "Conference Room 2"
];

/**
 * Find alternative slots for a requested booking
 * Strategy:
 * 1. Same hall, +/- 2 days (same time)
 * 2. Other halls, same date & time
 *
 * @param {String} hall - Requested hall
 * @param {Date} date - Requested date
 * @param {String} startTime - "HH:MM"
 * @param {String} endTime - "HH:MM"
 * @returns {Array} List of available alternatives
 */
const findAlternativeSlots = async (hall, dateStr, startTimeStr, endTimeStr) => {
    const alternatives = [];
    const startDateTime = new Date(`${dateStr}T${startTimeStr}`);
    const endDateTime = new Date(`${dateStr}T${endTimeStr}`);
    const durationMs = endDateTime - startDateTime;

    // 1. Check Same Hall, +/- 2 Days
    const datesToCheck = [];
    for (let i = 1; i <= 2; i++) {
        const nextDay = new Date(startDateTime);
        nextDay.setDate(startDateTime.getDate() + i);
        datesToCheck.push(nextDay);

        const prevDay = new Date(startDateTime);
        prevDay.setDate(startDateTime.getDate() - i);
        // Don't suggest past dates
        if (prevDay >= new Date()) {
            datesToCheck.push(prevDay);
        }
    }

    for (const checkDate of datesToCheck) {
        const checkStart = checkDate;
        const checkEnd = new Date(checkDate.getTime() + durationMs);

        const isConflict = await Booking.exists({
            hall,
            status: { $in: ["pending", "approved"] },
            $or: [
                { startTime: { $lt: checkEnd }, endTime: { $gt: checkStart } }
            ]
        });

        if (!isConflict) {
            alternatives.push({
                hall,
                startTime: checkStart,
                endTime: checkEnd,
                reason: `Available on ${checkStart.toLocaleDateString()}`
            });
        }
    }

    // 2. Check Other Halls, Same Date & Time
    const otherHalls = ALL_HALLS.filter(h => h !== hall);

    // We can optimize this by doing a single query for all bookings in this time slot
    // then finding halls NOT in that list
    const busyHallsInSlot = await Booking.distinct("hall", {
        status: { $in: ["pending", "approved"] },
        startTime: { $lt: endDateTime },
        endTime: { $gt: startDateTime }
    });

    const availableHalls = otherHalls.filter(h => !busyHallsInSlot.includes(h));

    availableHalls.slice(0, 3).forEach(availHall => {
        alternatives.push({
            hall: availHall,
            startTime: startDateTime,
            endTime: endDateTime,
            reason: `Available in ${availHall} at requested time`
        });
    });

    return alternatives.slice(0, 5); // Return top 5 suggestions
};

module.exports = {
    findAlternativeSlots
};
