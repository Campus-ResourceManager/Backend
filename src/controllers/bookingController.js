const Booking = require("../models/booking");

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

    if (conflictBooking && !overrideRequested) {
      return res.status(409).json({
        success: false,
        conflict: true,
        message: "Hall already booked. Do you want to request override?"
      });
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
      status: "pending",
      isConflict: Boolean(conflictBooking),
      conflictReason: conflictBooking ? conflictReason : "",
      overriddenBooking: conflictBooking ? conflictBooking._id : null
    });


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
      .select("facultyName facultyDepartment facultyDesignation facultyEmail eventTitle eventDescription hall capacity startTime endTime isConflict overriddenBooking status")
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
      .select("facultyName facultyDepartment facultyDesignation facultyEmail eventTitle eventDescription hall capacity startTime endTime isConflict overriddenBooking status")
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
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "approved") {
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
        return res.status(409).json({
          success: false,
          status: "rejected",
          message: "Hall is no longer available for this time slot"
        });
      }
    }

    // If this is an override booking → reject old one
    if (booking.isConflict && booking.overriddenBooking) {
      await Booking.findByIdAndUpdate(
        booking.overriddenBooking,
        {
          status: "rejected",
          rejectionReason: "Overridden by admin approval"
        }
      );
    }

    booking.status = "approved";
    booking.rejectionReason = "";
    await booking.save();

    return res.status(200).json({
      success: true,
      status: booking.status,
      message: "Booking approved successfully (override applied)",
      booking
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
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

module.exports = {
  createBooking,
  getMyBookings,
  getAvailability,
  getPendingBookings,
  getAllBookings,
  approveBooking,
  rejectBooking
};

