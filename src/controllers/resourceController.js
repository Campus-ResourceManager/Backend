const Resource = require("../models/resource");
const Booking = require("../models/booking");

/* ============================================================
   GET /api/resources
   Optional Query Params:
   ?type=hall
   ?type=classroom
   ?block=Academic Block - 1
   ============================================================ */
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
      .sort({ name: 1 })
      .lean();

    return res.status(200).json(resources);

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};


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

    // 🔥 Overlap logic
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
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/* ============================================================
   GET /api/resources/availability/bulk
   ============================================================ */
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

    const resourceFilter = { isActive: true };

    if (block) resourceFilter.block = block;
    if (type) resourceFilter.type = type;

    const resources = await Resource.find(resourceFilter).lean();

    const conflicts = await Booking.find({
      status: "approved",
      startTime: { $lt: endDateTime },
      endTime: { $gt: startDateTime }
    }).lean();

    const conflictResourceIds = new Set(
      conflicts.map(b => b.resource.toString())
    );

    const result = resources.map(resource => ({
      ...resource,
      available: !conflictResourceIds.has(resource._id.toString())
    }));

    return res.status(200).json(result);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getResources,
  checkResourceAvailability,
  getBulkAvailability
};