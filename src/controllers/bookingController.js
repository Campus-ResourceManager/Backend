const Booking = require("../models/booking");
const Resource = require("../models/resource");

/* ============================================================
   Helper: Check overlapping bookings for a resource
   ============================================================ */
const hasConflictForResource = async (
  resourceId,
  startTime,
  endTime,
  excludeBookingId = null
) => {
  const query = {
    resource: resourceId,
    status: { $in: ["pending", "approved"] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Booking.exists(query);
};

/* ============================================================
   POST /api/bookings
   Create Booking
   ============================================================ */
const createBooking = async (req, res) => {
  try {
    const {
      facultyName,
      facultyDepartment,
      facultyDesignation,
      facultyEmail,
      eventTitle,
      eventDescription,
      resourceId,
      date,
      startTime,
      endTime,
      overrideRequested,
      conflictReason
    } = req.body;

    if (
      !facultyName ||
      !eventTitle ||
      !resourceId ||
      !date ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message:
          "facultyName, eventTitle, resourceId, date, startTime and endTime are required"
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

    const now = new Date();
    if (endDateTime < now) {
      return res.status(400).json({
        success: false,
        message: "Cannot create booking for a past time slot"
      });
    }

    // 🔥 Validate resource exists
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({
        message: "Resource not found"
      });
    }

    // 🔥 Check conflict
    const conflictBooking = await Booking.findOne({
      resource: resourceId,
      status: "approved",
      startTime: { $lt: endDateTime },
      endTime: { $gt: startDateTime }
    });

    if (conflictBooking && !overrideRequested) {
      return res.status(409).json({
        success: false,
        conflict: true,
        message: "Resource already booked. Do you want to request override?"
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
      resource: resourceId,
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

/* ============================================================
   GET /api/bookings/my
   ============================================================ */
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      coordinator: req.session.user.userId
    })
      .populate("resource")
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

/* ============================================================
   GET /api/bookings/availability
   ============================================================ */
const getAvailability = async (req, res) => {
  try {
    const bookings = await Booking.find({
      status: { $in: ["pending", "approved"] }
    })
      .populate("resource", "name type block capacity")
      .select("resource startTime endTime status eventTitle facultyName")
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

/* ============================================================
   GET /api/bookings/pending
   ============================================================ */
const getPendingBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "pending" })
      .populate("coordinator", "username role")
      .populate("resource")
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

/* ============================================================
   GET /api/bookings
   ============================================================ */
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("coordinator", "username role")
      .populate("resource")
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

/* ============================================================
   PATCH /api/bookings/:id/approve
   ============================================================ */
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

    // 🔥 If NOT override → recheck conflict
    if (!booking.isConflict) {
      const conflict = await hasConflictForResource(
        booking.resource,
        booking.startTime,
        booking.endTime,
        booking._id
      );

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: "Resource is no longer available"
        });
      }
    }

    // 🔥 If override → reject old booking
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

/* ============================================================
   PATCH /api/bookings/:id/reject
   ============================================================ */
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