const Booking = require("../models/booking");
const Room = require("../models/Room");
const { createLog } = require("./auditLogController");

// Helper to check overlapping bookings for a hall
// excludeBookingId: optional ID to exclude from conflict check (useful when approving existing booking)
const hasConflictForHall = async (hall, startTime, endTime, excludeBookingId = null) => {
  const query = {
    hall,
    status: { $in: ["pending", "approved"] },
    $or: [
      // Existing starts before new end and ends after new start => overlap
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };

  // Exclude current booking from conflict check
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Booking.exists(query);
};

// POST /api/bookings
// Coordinator creates a booking request with faculty + event details
const createBooking = async (req, res) => {
  try {
    const {
      facultyName,
      facultyDepartment,
      facultyDesignation,
      facultyEmail,
      eventTitle,
      eventDescription,
      hall,
      capacity,
      date, // e.g. "2025-02-01"
      startTime, // e.g. "10:00"
      endTime, // e.g. "12:00"
      priority,
      eventType,
      overrideRequested,   // boolean
      conflictReason       // string
    } = req.body;

    if (!facultyName || !eventTitle || !hall || !date || !startTime || !endTime) {
      return res.status(400).json({
        message:
          "facultyName, eventTitle, hall, date, startTime and endTime are required"
      });
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({
        message: "Invalid date or time format"
      });
    }

    if (endDateTime <= startDateTime) {
      return res.status(400).json({
        message: "End time must be after start time"
      });
    }

    // Check if the time slot is in the past
    const now = new Date();
    if (startDateTime < now && endDateTime < now) {
      return res.status(400).json({
        success: false,
        message: "Cannot create booking for a time slot that has already passed"
      });
    }

    const conflictBooking = await Booking.findOne({
      hall,
      status: "approved",
      startTime: { $lt: endDateTime },
      endTime: { $gt: startDateTime }
    });

    const priorityOrder = { "Normal": 0, "High": 1, "Critical": 2 };
    const newPriorityVal = priorityOrder[priority || "Normal"] || 0;

    if (conflictBooking) {
      const existingPriorityVal = priorityOrder[conflictBooking.priority || "Normal"] || 0;

      if (newPriorityVal < existingPriorityVal) {
        return res.status(403).json({
          success: false,
          message: `Cannot request override: Existing event "${conflictBooking.eventTitle}" has higher priority (${conflictBooking.priority}).`
        });
      }

      if (!overrideRequested) {
        return res.status(409).json({
          success: false,
          conflict: true,
          message: "Hall already booked. Do you want to request override?"
        });
      }
    }

    if (!capacity || capacity < 1 || capacity > 300) {
      return res.status(400).json({
        message: "Capacity must be between 1 and 300"
      });
    }


    const booking = await Booking.create({
      coordinator: req.session.user.userId,
      facultyName,
      facultyDepartment,
      facultyDesignation,
      facultyEmail,
      eventTitle,
      eventDescription,
      hall,
      capacity: parseInt(capacity),
      startTime: startDateTime,
      endTime: endDateTime,
      priority: priority || "Normal",
      eventType: eventType || "Academic",
      status: "pending",
      isConflict: Boolean(conflictBooking),
      conflictReason: conflictBooking ? conflictReason : "",
      overriddenBooking: conflictBooking ? conflictBooking._id : null
    });

    await createLog(
      req.session.user.userId,
      req.session.user.username,
      "BOOKING_CREATE",
      "Booking",
      booking._id,
      `Created booking for ${hall} - ${eventTitle}`
    );


    return res.status(201).json({
      success: true,
      status: booking.status,
      message: "Booking request submitted and is pending admin approval",
      booking
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

// GET /api/bookings/my
// Coordinator: list own booking requests
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      coordinator: req.session.user.userId
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

// GET /api/bookings/availability
// Coordinator: view all approved/pending bookings for availability checking
const getAvailability = async (req, res) => {
  try {
    const bookings = await Booking.find({
      status: { $in: ["pending", "approved"] }
    })
      .select("hall capacity startTime endTime status eventTitle facultyName facultyDesignation facultyEmail")
      .sort({ startTime: 1 })
      .lean();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

// GET /api/bookings/pending
// Admin: list all pending booking requests
const getPendingBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "pending" })
      .select("facultyName facultyDepartment facultyDesignation facultyEmail eventTitle eventDescription hall capacity startTime endTime isConflict conflictReason overriddenBooking status")
      .populate("coordinator", "username role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

// GET /api/bookings
// Admin: list all bookings (any status)
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .select("facultyName facultyDepartment facultyDesignation facultyEmail eventTitle eventDescription hall capacity startTime endTime isConflict conflictReason overriddenBooking status")
      .populate("coordinator", "username role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

// PATCH /api/bookings/:id/approve
const approveBooking = async (req, res) => {
  console.log("approveBooking called for ID:", req.params.id);
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      console.log("Booking not found");
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "approved") {
      console.log("Booking already approved");
      return res.status(400).json({ message: "Booking is already approved" });
    }

    // Only check conflict for NON-override bookings
    if (!booking.isConflict) {
      const conflict = await hasConflictForHall(
        booking.hall,
        booking.startTime,
        booking.endTime,
        booking._id
      );

      if (conflict) {
        console.log("Conflict detected during approval");
        return res.status(409).json({
          success: false,
          status: "rejected",
          message: "Hall is no longer available for this time slot (Conflict with another approved booking)"
        });
      }
    }

    // Double check priority for override requests
    if (booking.isConflict && booking.overriddenBooking) {
      const existingBooking = await Booking.findById(booking.overriddenBooking);
      if (existingBooking && existingBooking.status === "approved") {
        const priorityOrder = { "Normal": 0, "High": 1, "Critical": 2 };
        const newPriorityVal = priorityOrder[booking.priority || "Normal"] || 0;
        const existingPriorityVal = priorityOrder[existingBooking.priority || "Normal"] || 0;

        if (newPriorityVal < existingPriorityVal) {
          return res.status(403).json({
            success: false,
            message: `Approval failed: New event priority (${booking.priority}) is lower than existing event priority (${existingBooking.priority}).`
          });
        }
      }
    }


    // If this is an override booking → reject old one
    if (booking.isConflict && booking.overriddenBooking) {
      console.log("Processing override for:", booking.overriddenBooking);
      try {
        await Booking.findByIdAndUpdate(
          booking.overriddenBooking,
          {
            status: "rejected",
            rejectionReason: "Overridden by admin approval"
          }
        );

        console.log("Old booking rejected. Creating log...");
        await createLog(
          req.session.user.userId,
          req.session.user.username,
          "BOOKING_OVERRIDE",
          "Booking",
          booking.overriddenBooking,
          `Overrode booking (${booking.overriddenBooking}) with higher priority event: ${booking.eventTitle} (${booking.priority})`
        );
      } catch (overrideError) {
        console.error("Error processing override:", overrideError);
        // Continue? Or fail? Usually continue as we want to approve the new one.
      }
    }

    booking.status = "approved";
    booking.rejectionReason = "";

    console.log("Saving booking...");
    await booking.save();
    console.log("Booking saved successfully");

    console.log("Creating approval log...");
    if (typeof createLog !== 'function') {
      console.error("CRITICAL: createLog is not a function!");
    } else {
      await createLog(
        req.session.user.userId,
        req.session.user.username,
        "BOOKING_APPROVE",
        "Booking",
        booking._id,
        `Approved booking: ${booking.eventTitle}`
      );
      console.log("Approval log created");
    }

    return res.status(200).json({
      success: true,
      status: booking.status,
      message: "Booking approved successfully (override applied)",
      booking
    });

  } catch (error) {
    console.error("Error in approveBooking:", error);
    // Return the stack trace in development for easier debugging
    return res.status(500).json({
      message: "Server error during approval",
      error: process.env.NODE_ENV === 'development' ? error.stack : error.message
    });
  }
};

// PATCH /api/bookings/:id/reject
const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      id,
      {
        status: "rejected",
        rejectionReason: reason || ""
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await createLog(
      req.session.user.userId,
      req.session.user.username,
      "BOOKING_REJECT",
      "Booking",
      id,
      `Rejected booking: ${booking.eventTitle}. Reason: ${reason || "None"}`
    );

    return res.status(200).json({
      success: true,
      status: booking.status,
      message: "Booking rejected",
      booking
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

// POST /api/bookings/recommend
// Recommend rooms based on criteria + booking frequency scoring
const recommendRooms = async (req, res) => {
  try {
    const { date, startTime, endTime, attendees, limit } = req.body;

    if (!date || !startTime || !endTime || !attendees) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);
    const requiredCapacity = parseInt(attendees);

    // Determine how many rooms to return
    let roomLimit = 5; // default top 5
    if (limit === 'all') roomLimit = 999;
    else if (limit === 10) roomLimit = 10;
    else if (limit === 5) roomLimit = 5;
    else if (parseInt(limit) > 0) roomLimit = parseInt(limit);

    // 1. Find rooms with sufficient capacity
    const eligibleRooms = await Room.find({
      capacity: { $gte: requiredCapacity },
      isActive: true
    }).sort({ capacity: 1 }); // Sort by capacity asc (best fit first)

    if (eligibleRooms.length === 0) {
      return res.status(200).json({
        rooms: [],
        aiMessage: `No rooms found with capacity for ${requiredCapacity} people. Try reducing the number of attendees or contact admin to add more rooms.`
      });
    }

    // 2. Check for time conflicts and get booking frequency (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const availableRooms = [];
    for (const room of eligibleRooms) {
      const conflict = await Booking.findOne({
        hall: room.name,
        status: { $in: ["approved", "pending"] },
        startTime: { $lt: endDateTime },
        endTime: { $gt: startDateTime }
      });

      if (!conflict) {
        // Count past bookings for this room (lower = less used = should be prioritized)
        const bookingCount = await Booking.countDocuments({
          hall: room.name,
          status: { $in: ["approved", "pending"] },
          createdAt: { $gte: ninetyDaysAgo }
        });

        const capacityWaste = room.capacity - requiredCapacity; // lower = better fit

        availableRooms.push({
          ...room.toObject(),
          bookingCount,
          capacityWaste,
          // Score: lower is better. Prioritize least-booked, then best capacity fit
          score: (bookingCount * 10) + capacityWaste
        });
      }
    }

    // Sort by score (least booked + best fit first)
    availableRooms.sort((a, b) => a.score - b.score);

    // Apply limit
    const finalRooms = availableRooms.slice(0, roomLimit);

    let aiMessage;
    if (finalRooms.length === 0) {
      aiMessage = `All rooms with capacity for ${requiredCapacity}+ people are booked during ${startTime}–${endTime} on ${date}. Try a different time slot.`;
    } else {
      const topRoom = finalRooms[0];
      aiMessage = `Found ${availableRooms.length} available room${availableRooms.length !== 1 ? 's' : ''} for ${requiredCapacity} people. ` +
        `Showing top ${finalRooms.length} recommendation${finalRooms.length !== 1 ? 's' : ''} sorted by least-used and best capacity fit. ` +
        `"${topRoom.name}" (capacity: ${topRoom.capacity}) is the top pick with only ${topRoom.bookingCount} recent booking${topRoom.bookingCount !== 1 ? 's' : ''}.`;
    }

    res.status(200).json({ rooms: finalRooms, aiMessage, totalAvailable: availableRooms.length });
  } catch (error) {
    console.error("Error recommending rooms:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getAvailability,
  getPendingBookings,
  getAllBookings,
  approveBooking,
  rejectBooking,
  recommendRooms
};
