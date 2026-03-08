/**
 * Booking Management Controller
 * 
 * This is the core logic engine of the application. It handles:
 * 1. Creating booking requests with conflict detection.
 * 2. Approving/Rejecting bookings with fairness scoring and penalties.
 * 3. Smart reallocation of displaced bookings.
 * 4. Availability lookups and profile management.
 */

const Booking = require("../models/booking");
const Resource = require("../models/resource");
const { findAlternativeHalls } = require("../services/reallocationEngine");
const FacultyProfile = require("../models/facultyProfile");

/**
 * Helper: Check overlapping bookings for a specific resource
 * 
 * @param {string} resourceId - The ID of the hall or classroom
 * @param {Date} startTime - Start of the requested window
 * @param {Date} endTime - End of the requested window
 * @param {string} [excludeBookingId] - Optional ID to ignore (for updates)
 * @returns {Promise<boolean>} - True if a conflict exists
 */
const hasConflictForResource = async (
  resourceId,
  startTime,
  endTime,
  excludeBookingId = null
) => {
  const query = {
    resource: resourceId,
    // Only 'pending' or 'approved' bookings count as conflicts
    status: { $in: ["pending", "approved"] },
    // Time overlap logic: (StartA < EndB) AND (EndA > StartB)
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return Booking.exists(query);
};

/**
 * POST /api/bookings
 * Create a new booking request.
 */
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
      overrideRequested, // If true, user is aware of a conflict and requesting an override
      conflictReason
    } = req.body;

    // Basic required field validation
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

    // Parse date/time strings into JS Date objects
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

    // Prevent bookings in the past
    const now = new Date();

    if (endDateTime < now) {
      return res.status(400).json({
        success: false,
        message: "Cannot create booking for a past time slot"
      });
    }

    // 🔹 Validate resource exists
    const resource = await Resource.findById(resourceId);

    if (!resource || !resource.isActive) {
      return res.status(404).json({
        message: "Resource not found or inactive"
      });
    }

    // 🔹 Check for existing approved booking conflict
    const conflictBooking = await Booking.findOne({
      resource: resourceId,
      status: "approved",
      startTime: { $lt: endDateTime },
      endTime: { $gt: startDateTime }
    });

    // If a conflict exists and override wasn't explicitly requested, notify user
    if (conflictBooking && !overrideRequested) {
      return res.status(409).json({
        success: false,
        conflict: true,
        message: "Resource already booked. Do you want to request override?"
      });
    }

    // 🔹 Ensure faculty profile exists
    let profile = await FacultyProfile.findOne({ email: facultyEmail });

    if (!profile) {
      profile = await FacultyProfile.create({
        email: facultyEmail,
        name: facultyName,
        department: facultyDepartment || ""
      });
    }

    // 🔹 Calculate used credits this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

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

    const proposedCost = resource.creditCost ?? 1;

    // 🔹 Create booking
    const booking = await Booking.create({
      coordinator: req.session.user.userId,
      resource: resourceId,
      facultyName,
      facultyDepartment,
      facultyDesignation,
      facultyEmail,
      eventTitle,
      eventDescription,
      startTime: startDateTime,
      endTime: endDateTime,
      status: "pending",
      // Capture a snapshot of the priority score at the time of request
      priorityScoreAtBooking: profile.priorityScore,
      isConflict: Boolean(conflictBooking && overrideRequested),
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
    console.error("Create Booking Error:", error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * GET /api/bookings/my
 * Returns all bookings created by the currently logged-in coordinator.
 */
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
    console.error("Get My Bookings Error:", error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * GET /api/bookings/availability
 * Returns all active bookings to visualize on a calendar/grid.
 */
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
    console.error("Get Availability Error:", error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * GET /api/bookings/pending
 * [Admin only] Returns all pending booking requests for review.
 */
const getPendingBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "pending" })
      .populate("coordinator", "username role")
      .populate("resource")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get Pending Error:", error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * GET /api/bookings
 * [Admin only] Returns all bookings in history.
 */
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("coordinator", "username role")
      .populate("resource")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get All Bookings Error:", error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * PATCH /api/bookings/:id/approve
 * [Admin only] Approves a booking request and handles fairness penalties.
 */
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

    // Re-verify availability if this wasn't an intentional override request
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

    // Handle Override Reallocation Logic
    if (booking.isConflict && booking.overriddenBooking) {
      const displacedBooking = await Booking
        .findById(booking.overriddenBooking)
        .populate("resource");

      const suggestions = await findAlternativeHalls(displacedBooking);

      return res.status(200).json({
        success: true,
        type: "reallocation",
        message: "Conflict detected. Admin confirmation required.",
        suggestions,
        displacedBooking,
        bookingToApprove: booking._id
      });
    }

    /**
     * Fairness & Penalty Logic
     * 
     * We calculate the total credits used by this faculty member this month.
     * If approving this booking puts them over their quota, we deduct priority points.
     */
    const facultyEmail = booking.facultyEmail;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let profile = await FacultyProfile.findOne({ email: facultyEmail });
    if (profile) {
      // Fetch all other approved bookings for this faculty this month
      const monthlyBookings = await Booking.find({
        facultyEmail,
        status: "approved",
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

      // Check if total usage exceeds the allowed quota (typically 20)
      if (usedCredits + proposedCost > profile.monthlyQuota) {
        const excess = (usedCredits + proposedCost) - profile.monthlyQuota;

        // Dynamic Penalty calculation: Base 10 + 5 for every 5 units of excess
        const penaltyAmount = 10 + Math.floor(excess / 5) * 5;

        // Apply penalty and ensure score never drops below 0
        profile.priorityScore = Math.max(0, profile.priorityScore - penaltyAmount);
        await profile.save();

        // Update the snapshot for this specific booking
        booking.priorityScoreAtBooking = profile.priorityScore;
      }
    }

    // Finalize approval
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
    console.error("Approve Booking Error:", error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * PATCH /api/bookings/:id/reject
 * [Admin only] Rejects a booking request with a reason.
 */
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
    console.error("Reject Booking Error:", error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * GET /api/bookings/faculty/:email
 * Retrieves faculty profile and calculates real-time credit usage for the month.
 */
const getFacultyProfile = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    let profile = await FacultyProfile.findOne({ email });

    // Return defaults if profile doesn't exist yet
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

    // Sum up credits for all pending/approved bookings this month
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
    console.error("Get Faculty Profile Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/bookings/fairness-stats
 * Returns lists of faculty for monitoring fairness and priority scores.
 */
const getFairnessStats = async (req, res) => {
  try {
    // Note: 'usedCredits' is virtual/calculated, so we sort by priorityScore primarily
    const topFaculty = await FacultyProfile.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    // Find the faculty with the lowest priority scores (most penalized)
    const lowPriority = await FacultyProfile.find()
      .sort({ priorityScore: 1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      lowPriority,
      topFaculty,
      msg: "System fairness statistics retrieved"
    });
  } catch (error) {
    console.error("Get Fairness Stats Error:", error);
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
