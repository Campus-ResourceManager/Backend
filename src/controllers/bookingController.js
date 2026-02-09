const Booking = require("../models/booking");
const { calculatePriorityScore, compareBookings } = require("../utils/prioritySystem");
const { findAlternativeSlots } = require("../utils/slotSuggestion");
const ApprovalLog = require("../models/approvalLog");

// Helper to check overlapping bookings for a hall
// excludeBookingId: optional ID to exclude from conflict check (useful when approving existing booking)
const hasConflictForHall = async (hall, startTime, endTime, excludeBookingId = null) => {
  const query = {
    hall,
    status: { $in: ["pending", "approved"] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Booking.findOne(query).sort({ priorityScore: -1 }); // Get the highest priority conflicting booking
};

// POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const {
      facultyName,
      facultyDepartment,
      facultyEmail,
      eventTitle,
      eventDescription,
      eventCategory = "Student", // Default
      expectedAttendance = 0,
      hall,
      date,
      startTime,
      endTime,
      overrideRequested,
      conflictReason
    } = req.body;

    if (!facultyName || !eventTitle || !hall || !date || !startTime || !endTime) {
      return res.status(400).json({
        message: "Required fields: facultyName, eventTitle, hall, date, startTime, endTime"
      });
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({ message: "Invalid date or time format" });
    }

    if (endDateTime <= startDateTime) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    const now = new Date();
    if (startDateTime < now) {
      return res.status(400).json({ message: "Cannot book past time slots" });
    }

    // 1. Calculate Priority Score
    const { totalScore, details } = calculatePriorityScore(
      eventCategory,
      new Date(), // booking date (now)
      startDateTime,
      expectedAttendance
    );

    // 2. Check for Conflicts
    const conflictBooking = await hasConflictForHall(hall, startDateTime, endDateTime);

    if (conflictBooking && !overrideRequested) {
      // Generate Priority Comparison
      const priorityAnalysis = compareBookings(
        { priorityScore: totalScore },
        { priorityScore: conflictBooking.priorityScore }
      );

      // Find Alternatives
      const alternatives = await findAlternativeSlots(hall, date, startTime, endTime);

      return res.status(409).json({
        success: false,
        conflict: true,
        message: "Hall already booked during this time.",
        conflictDetails: {
          existingBooking: {
            eventTitle: conflictBooking.eventTitle,
            category: conflictBooking.eventCategory,
            priorityScore: conflictBooking.priorityScore
          },
          newBooking: {
            priorityScore: totalScore
          },
          analysis: priorityAnalysis
        },
        alternatives
      });
    }

    // 3. Create Booking (Pending)
    const booking = await Booking.create({
      coordinator: req.session.user.userId,
      facultyName,
      facultyDepartment,
      facultyEmail,
      eventTitle,
      eventDescription,
      eventCategory,
      expectedAttendance,
      priorityScore: totalScore,
      priorityDetails: details,
      hall,
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
      message: "Booking request submitted successfully",
      booking
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
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
      .select("hall startTime endTime status eventTitle facultyName")
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
    const { remarks } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "approved") {
      return res.status(400).json({ message: "Booking is already approved" });
    }

    const previousStatus = booking.status;

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
      const oldBooking = await Booking.findByIdAndUpdate(
        booking.overriddenBooking,
        {
          status: "rejected",
          rejectionReason: "Overridden by higher priority event"
        }
      );

      // Log rejection of old booking
      if (oldBooking) {
        await ApprovalLog.create({
          booking: oldBooking._id,
          action: "Rejected",
          performedBy: req.session.user.userId,
          previousStatus: "approved",
          newStatus: "rejected",
          remarks: "System Auto-Rejection: Overridden by priority booking",
          snapshot: {
            priorityScore: oldBooking.priorityScore,
            eventCategory: oldBooking.eventCategory
          }
        });
      }
    }

    booking.status = "approved";
    booking.rejectionReason = "";
    await booking.save();

    // Log Approval
    await ApprovalLog.create({
      booking: booking._id,
      action: "Approved",
      performedBy: req.session.user.userId,
      previousStatus,
      newStatus: "approved",
      remarks: remarks || "Approved by Admin",
      snapshot: {
        priorityScore: booking.priorityScore,
        eventCategory: booking.eventCategory,
        conflictDetails: booking.priorityDetails
      }
    });

    return res.status(200).json({
      success: true,
      status: booking.status,
      message: "Booking approved successfully",
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

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const previousStatus = booking.status;

    booking.status = "rejected";
    booking.rejectionReason = reason || "";
    await booking.save();

    // Log Rejection
    await ApprovalLog.create({
      booking: booking._id,
      action: "Rejected",
      performedBy: req.session.user.userId,
      previousStatus,
      newStatus: "rejected",
      remarks: reason || "Rejected by Admin",
      snapshot: {
        priorityScore: booking.priorityScore,
        eventCategory: booking.eventCategory
      }
    });

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

// GET /api/bookings/:id/logs
const getBookingLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await ApprovalLog.find({ booking: id })
      .populate("performedBy", "username role")
      .sort({ createdAt: -1 });

    return res.status(200).json(logs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
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
  getBookingLogs
};

