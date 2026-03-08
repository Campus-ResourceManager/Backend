const Booking = require("../models/booking");
const Resource = require("../models/resource");
const { findAlternativeHalls } = require("../services/reallocationEngine");
const FacultyProfile = require("../models/facultyProfile");

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
      (!resourceId && !req.body.hall) ||
      !date ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message:
          "facultyName, eventTitle, resourceId (or hall name), date, startTime and endTime are required"
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
    let resource;
    if (resourceId) {
      resource = await Resource.findById(resourceId);
    } else if (req.body.hall) {
      resource = await Resource.findOne({ name: req.body.hall, isActive: true });
    }

    if (!resource) {
      return res.status(404).json({
        message: "Resource not found"
      });
    }

    const finalResourceId = resource._id;

    // 🔥 Check conflict
    const conflictBooking = await Booking.findOne({
      resource: finalResourceId,
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

    // 🔥 Check faculty credits & apply fairness penalty if needed
    let profile = await FacultyProfile.findOne({ email: facultyEmail });
    if (!profile) {
      profile = await FacultyProfile.create({
        email: facultyEmail,
        name: facultyName,
        department: facultyDepartment || ""
      });
    }

    // Calculate used credits this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyBookings = await Booking.find({
      facultyEmail,
      status: { $in: ["pending", "approved"] },
      startTime: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate("resource");

    let usedCredits = 0;
    for (const b of monthlyBookings) {
      if (b.resource && b.resource.creditCost) {
        usedCredits += b.resource.creditCost;
      }
    }

    const proposedCost = resource.creditCost || 1;
    // Note: We no longer apply the penalty here at request time.
    // It will be applied in approveBooking when the administrator confirms it.

    const booking = await Booking.create({
      coordinator: req.session.user.userId,
      resource: finalResourceId,
      facultyName,
      facultyDepartment,
      facultyDesignation,
      facultyEmail,
      eventTitle,
      eventDescription,
      startTime: startDateTime,
      endTime: endDateTime,
      status: "pending",
      priorityScoreAtBooking: profile.priorityScore,
      isConflict: overrideRequested || false,
      conflictReason: conflictReason || "",
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

    if (booking.isConflict && booking.overriddenBooking) {

      const displacedBooking = await Booking
        .findById(booking.overriddenBooking)
        .populate("resource");

      // 🔹 Run smart reallocation
      const suggestions = await findAlternativeHalls(displacedBooking);

      // mark displaced booking
      displacedBooking.status = "reallocation_pending";
      await displacedBooking.save();

      booking.status = "approved";
      await booking.save();

      return res.status(200).json({
        success: true,
        type: "reallocation",
        message: "Booking approved. Reallocation required.",
        suggestions,
        displacedBooking
      });
    }

    // 🔥 Apply fairness penalty on approval if quota is exceeded
    const facultyEmail = booking.facultyEmail;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let profile = await FacultyProfile.findOne({ email: facultyEmail });
    if (profile) {
      const monthlyBookings = await Booking.find({
        facultyEmail,
        status: "approved", // Only count already approved ones for the final check
        _id: { $ne: booking._id },
        startTime: { $gte: startOfMonth, $lte: endOfMonth }
      }).populate("resource");

      let usedCredits = 0;
      for (const b of monthlyBookings) {
        if (b.resource && b.resource.creditCost) {
          usedCredits += b.resource.creditCost;
        }
      }

      await booking.populate("resource");
      const proposedCost = booking.resource?.creditCost || 1;

      if (usedCredits + proposedCost > profile.monthlyQuota) {
        const excess = (usedCredits + proposedCost) - profile.monthlyQuota;
        const penaltyAmount = 10 + Math.floor(excess / 5) * 5;

        profile.priorityScore = Math.max(0, profile.priorityScore - penaltyAmount);
        await profile.save();

        // Update the snapshot for this specific booking to reflect the final score
        booking.priorityScoreAtBooking = profile.priorityScore;
      }
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

/* ============================================================
   GET /api/bookings/faculty/:email
   Retrieve faculty profile and current month's credit usage
   ============================================================ */
const getFacultyProfile = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    let profile = await FacultyProfile.findOne({ email });

    // If no profile found, we'll return a basic one with default values
    // as it will be created on first booking anyway
    if (!profile) {
      return res.status(200).json({
        email,
        name: "",
        department: "",
        monthlyQuota: 20,
        priorityScore: 100,
        usedCredits: 0
      });
    }

    // Calculate used credits this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyBookings = await Booking.find({
      facultyEmail: email,
      status: { $in: ["pending", "approved"] },
      startTime: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate("resource");

    let usedCredits = 0;
    for (const b of monthlyBookings) {
      if (b.resource && b.resource.creditCost) {
        usedCredits += b.resource.creditCost;
      }
    }

    return res.status(200).json({
      ...profile.toObject(),
      usedCredits
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   GET /api/bookings/fairness-stats
   Retrieve top faculty by credit usage and lowest priority scores
   ============================================================ */
const getFairnessStats = async (req, res) => {
  try {
    const topFaculty = await FacultyProfile.find()
      .sort({ usedCredits: -1 })
      .limit(5)
      .lean();

    const lowPriority = await FacultyProfile.find()
      .sort({ priorityScore: 1 })
      .limit(5)
      .lean();

    // Since usedCredits is calculated on the fly in getFacultyProfile, 
    // we might need to calculate it here too for the list or store it in DB.
    // For now, let's fetch all and calculate for simplicity (if faculty count is small)
    // or just return priority scores which are stored.

    return res.status(200).json({
      lowPriority,
      msg: "System fairness statistics retrieved"
    });
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
  getFacultyProfile,
  getFairnessStats
};