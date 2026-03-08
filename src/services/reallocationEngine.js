/**
 * Reallocation Engine Service
 * 
 * Contains the logic for the 'Smart Suggestion' system.
 * When a user is displaced by a higher-priority booking, this engine finds
 * the best possible alternatives based on several heuristic factors.
 */

const Booking = require("../models/booking");
const Resource = require("../models/resource");

/**
 * Finds top-3 alternative halls for a displaced booking.
 * 
 * Heuristics used for scoring:
 * 1. Capacity Fit (50% weight): Prefers halls that are closest to the required size (not too small, not too large).
 * 2. Proximity (30% weight): Prefers halls on the same or nearby floors.
 * 3. Utilization (20% weight): Placeholder for future load-balancing logic.
 * 
 * @param {Object} displacedBooking - The booking object that was overridden.
 * @returns {Promise<Array>} - Array of top 3 suggested halls with scores.
 */
async function findAlternativeHalls(displacedBooking) {

  const requiredCapacity = displacedBooking.resource.capacity;
  const classroomFloor = displacedBooking.resource.floor || 0;

  //  Fetch all halls that are currently active in the system
  const halls = await Resource.find({
    type: "hall",
    isActive: true
  });

  const startTime = displacedBooking.startTime;
  const endTime = displacedBooking.endTime;

  const availableHalls = [];

  for (const hall of halls) {
    // 1. Conflict Check: Skip halls that are already booked or have a pending request
    const conflict = await Booking.exists({
      resource: hall._id,
      status: { $in: ["approved", "pending"] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    if (conflict) continue;

    // 2. Capacity Filter: Skip if the hall is too small to accommodate the group
    if (hall.capacity < requiredCapacity) continue;

    /**
     * 3. Scoring Heuristics
     */

    // Capacity Score: Higher score if hall capacity is closer to the requirement
    // (e.g., booking a 50-seater in a 60-seater hall is better than booking it in a 500-seater auditorium)
    const capacityScore = requiredCapacity / hall.capacity;

    // Proximity Score: Higher score if the hall is on the same floor or nearby
    const floorDistance = Math.abs((hall.floor || 0) - classroomFloor);
    const proximityScore = 1 / (1 + floorDistance);

    // Utilization Score: Fixed placeholder to simulate system load balancing
    const utilizationScore = 0.7;

    // Final Weighted Score calculation
    const score =
      (0.5 * capacityScore) +
      (0.3 * proximityScore) +
      (0.2 * utilizationScore);

    availableHalls.push({
      hall,
      score
    });
  }

  // Rank suggestions by their calculated score (highest first)
  availableHalls.sort((a, b) => b.score - a.score);

  // Return only the top 3 best-matching alternatives
  return availableHalls.slice(0, 3);
}

module.exports = { findAlternativeHalls };
