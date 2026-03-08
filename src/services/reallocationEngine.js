const Booking = require("../models/booking");
const Resource = require("../models/resource");

async function findAlternativeHalls(displacedBooking) {

  const requiredCapacity = displacedBooking.resource.capacity;
  const classroomFloor = displacedBooking.resource.floor;

  //  Fetch all halls
  const halls = await Resource.find({
    type: "hall",
    isActive: true
  });

  const startTime = displacedBooking.startTime;
  const endTime = displacedBooking.endTime;

  const availableHalls = [];

  for (const hall of halls) {

    //  Check conflict
    const conflict = await Booking.exists({
      resource: hall._id,
      status: { $in: ["approved", "pending"] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });

    if (conflict) continue;

    //  Capacity filter
    if (hall.capacity < requiredCapacity) continue;

    //  Score calculation
    const capacityScore = requiredCapacity / hall.capacity;

    const floorDistance = Math.abs((hall.floor || 0) - classroomFloor);
    const proximityScore = 1 / (1 + floorDistance);

    const utilizationScore = 0.7; // placeholder for now

    const score =
      (0.5 * capacityScore) +
      (0.3 * proximityScore) +
      (0.2 * utilizationScore);

    availableHalls.push({
      hall,
      score
    });
  }

  // Sort halls
  availableHalls.sort((a, b) => b.score - a.score);

  return availableHalls.slice(0, 3);
}

module.exports = { findAlternativeHalls };