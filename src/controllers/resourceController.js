/**
 * Resource Controller
 * 
 * Manages the inventory of halls and classrooms, and handles availability checks.
 */

const Resource = require("../models/resource");
const Booking = require("../models/booking");

/**
 * GET /api/resources
 * Fetches all active resources with optional filtering by type and block.
 * 
 * @query {string} [type] - 'hall' or 'classroom'
 * @query {string} [block] - Specific building block name
 */
const getResources = async (req, res) => {
  try {
    const { type, block } = req.query;

    const filter = { isActive: true };

    if (type) {
      filter.type = type;
    }

    if (block) {
      filter.block = block;
    }

    const resources = await Resource.find(filter)
      .sort({ name: 1 }) // List alphabetically by name
      .lean();

    return res.status(200).json(resources);

  } catch (error) {
    console.error("Get Resources Error:", error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * GET /api/resources/:id/availability
 * Checks if a specific resource is available for a given time window.
 */
const checkResourceAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime } = req.query;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        message: "date, startTime and endTime are required"
      });
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (isNaN(startDateTime) || isNaN(endDateTime)) {
      return res.status(400).json({
        message: "Invalid date or time format"
      });
    }

    if (endDateTime <= startDateTime) {
      return res.status(400).json({
        message: "End time must be after start time"
      });
    }

    // Check for any approved booking that overlaps with the requested window
    const conflict = await Booking.findOne({
      resource: id,
      status: "approved",
      startTime: { $lt: endDateTime },
      endTime: { $gt: startDateTime }
    });

    if (conflict) {
      return res.status(200).json({
        available: false,
        conflictBookingId: conflict._id
      });
    }

    return res.status(200).json({
      available: true
    });

  } catch (error) {
    console.error("Check Availability Error:", error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * GET /api/resources/availability/bulk
 * Checks availability for all resources in a single request. 
 * Useful for filtering available halls during the booking process.
 */
const getBulkAvailability = async (req, res) => {
  try {
    const { date, startTime, endTime, block, type } = req.query;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        message: "date, startTime and endTime are required"
      });
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    // Fetch candidate resources
    const resourceFilter = { isActive: true };
    if (block) resourceFilter.block = block;
    if (type) resourceFilter.type = type;

    const resources = await Resource.find(resourceFilter).lean();

    // Fetch all approved bookings for the requested time window
    const conflicts = await Booking.find({
      status: "approved",
      startTime: { $lt: endDateTime },
      endTime: { $gt: startDateTime }
    }).lean();

    // Create a Set of booked resource IDs for fast lookup
    const conflictResourceIds = new Set(
      conflicts.map(b => b.resource.toString())
    );

    // Map through resources and flag availability
    const result = resources.map(resource => ({
      ...resource,
      available: !conflictResourceIds.has(resource._id.toString())
    }));

    return res.status(200).json(result);

  } catch (error) {
    console.error("Bulk Availability Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getResources,
  checkResourceAvailability,
  getBulkAvailability
};
