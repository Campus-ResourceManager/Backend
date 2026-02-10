/**
 * Booking Controller
 * 
 * MODULES 2, 3, 4 - HALL BOOKING MANAGEMENT
 * 
 * This controller handles all booking-related operations including:
 * - MODULE 2: Creating booking requests with faculty and event details
 * - MODULE 3: Conflict detection, priority calculation, and alternative slot suggestions
 * - MODULE 4: Approval workflow, status tracking, and audit logs
 */

const Booking = require("../models/booking");
const { calculatePriorityScore, compareBookings } = require("../utils/prioritySystem");
const { findAlternativeSlots } = require("../utils/slotSuggestion");
const ApprovalLog = require("../models/approvalLog");

/**
 * MODULE 3 - Submodule 3.1: Time Slot Conflict Detection
 * 
 * Helper function to check if a hall has overlapping bookings
 * 
 * Conflict Detection Algorithm:
 * - Two bookings conflict if their time ranges overlap
 * - Overlap occurs when: (newStart < existingEnd) AND (newEnd > existingStart)
 * - Only checks against "pending" and "approved" bookings (ignores rejected)
 * 
 * @param {String} hall - Hall name to check
 * @param {Date} startTime - Start time of new booking
 * @param {Date} endTime - End time of new booking
 * @param {String} excludeBookingId - Optional booking ID to exclude (used when approving)
 * @returns {Object|null} - Highest priority conflicting booking, or null if no conflict
 */
const hasConflictForHall = async (hall, startTime, endTime, excludeBookingId = null) => {
  const query = {
    hall,
    status: { $in: ["pending", "approved"] }, // Only check active bookings
    $or: [
      {
        // Check for time overlap
        startTime: { $lt: endTime },    // Existing booking starts before new booking ends
        endTime: { $gt: startTime }     // Existing booking ends after new booking starts
      }
    ]
  };

  // Exclude a specific booking (useful when approving a booking)
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  // Return the highest priority conflicting booking
  return Booking.findOne(query).sort({ priorityScore: -1 });
};

/**
 * MODULE 2 - Hall Booking Request Creation
 * MODULE 3 - Conflict Detection & Priority Allocation
 * MODULE 4 - Submit for Approval
 * 
 * Create a new hall booking request
 * 
 * Process Flow:
 * 1. Validate required fields (MODULE 2.1: Faculty & Event Details)
 * 2. Validate date and time (MODULE 2.3: Date & Time Selection)
 * 3. Calculate priority score (MODULE 3.2: Priority-Based Allocation)
 * 4. Check for conflicts (MODULE 3.1: Conflict Detection)
 * 5. If conflict exists:
 *    - Compare priorities
 *    - Suggest alternatives (MODULE 3.3: Alternative Slot Suggestions)
 *    - Return conflict response
 * 6. If no conflict or override requested:
 *    - Create booking with status "pending"
 *    - Submit for approval (MODULE 4.1: Submit for Approval)
 * 
 * @route POST /api/bookings
 * @access Private (coordinator only)
 */
const createBooking = async (req, res) => {
  try {
    const {
      facultyName,
      facultyDepartment,
      facultyEmail,
      eventTitle,
      eventDescription,
      eventCategory = "Student", // Default category
      expectedAttendance = 0,
      hall,
      date,
      startTime,
      endTime,
      overrideRequested,  // Flag to force booking despite conflict
      conflictReason      // Reason for override request
    } = req.body;

    // MODULE 2.1: Validate Faculty & Event Details
    if (!facultyName || !eventTitle || !hall || !date || !startTime || !endTime) {
      return res.status(400).json({
        message: "Required fields: facultyName, eventTitle, hall, date, startTime, endTime"
      });
    }

    // MODULE 2.3: Validate Date & Time Slot
    // Convert date and time strings to Date objects
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    // Validate date format
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({ message: "Invalid date or time format" });
    }

    // Ensure end time is after start time
    if (endDateTime <= startDateTime) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    // Prevent booking past time slots
    const now = new Date();
    if (startDateTime < now) {
      return res.status(400).json({ message: "Cannot book past time slots" });
    }

    // MODULE 3.2: Calculate Priority Score
    // Priority is based on:
    // - Event category (Faculty > Department > Student Club > Student)
    // - Advance booking (earlier bookings get bonus)
    // - Expected attendance (larger events get bonus)
    const { totalScore, details } = calculatePriorityScore(
      eventCategory,
      new Date(), // booking date (now)
      startDateTime,
      expectedAttendance
    );

    // MODULE 3.1: Check for Time Slot Conflicts
    const conflictBooking = await hasConflictForHall(hall, startDateTime, endDateTime);

    // If conflict exists and override not requested, return conflict details
    if (conflictBooking && !overrideRequested) {
      // MODULE 3.2: Generate Priority Comparison
      const priorityAnalysis = compareBookings(
        { priorityScore: totalScore },
        { priorityScore: conflictBooking.priorityScore }
      );

      // MODULE 3.3: Find Alternative Slots
      const alternatives = await findAlternativeSlots(hall, date, startTime, endTime);

      // Return conflict response with alternatives
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

    // MODULE 4.1: Create Booking (Submit for Approval)
    // Status is set to "pending" - awaiting admin approval
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
      status: "pending",  // MODULE 4.1: Submitted for approval
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

/**
 * Get coordinator's own booking requests
 * 
 * MODULE 4.3: Status Tracking
 * Allows coordinators to view all their booking requests and track status
 * 
 * @route GET /api/bookings/my
 * @access Private (coordinator only)
 */
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      coordinator: req.session.user.userId
    })
      .sort({ createdAt: -1 })  // Most recent first
      .lean();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * Get hall availability (all approved/pending bookings)
 * 
 * MODULE 3.1: Conflict Detection Support
 * Coordinators can view all existing bookings to check availability
 * before creating a new booking request
 * 
 * @route GET /api/bookings/availability
 * @access Private (coordinator only)
 */
const getAvailability = async (req, res) => {
  try {
    const bookings = await Booking.find({
      status: { $in: ["pending", "approved"] }
    })
      .select("hall startTime endTime status eventTitle facultyName")
      .sort({ startTime: 1 })  // Chronological order
      .lean();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * Get all pending booking requests
 * 
 * MODULE 4.2: Approver Review
 * Admins view all pending bookings awaiting approval
 * 
 * @route GET /api/bookings/pending
 * @access Private (admin only)
 */
const getPendingBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "pending" })
      .populate("coordinator", "username role")  // Include coordinator details
      .sort({ createdAt: -1 })  // Most recent first
      .lean();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

/**
 * Get all bookings (any status)
 * 
 * Admin view of all bookings for management and reporting
 * 
 * @route GET /api/bookings
 * @access Private (admin only)
 */
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

/**
 * MODULE 4.2: Approve a booking request
 * 
 * Approval Process:
 * 1. Validate booking exists and is not already approved
 * 2. For non-override bookings: Re-check for conflicts (in case new bookings were created)
 * 3. For override bookings: Reject the lower-priority conflicting booking
 * 4. Update booking status to "approved"
 * 5. Create approval log entry (MODULE 4.3: Audit Trail)
 * 
 * @route PATCH /api/bookings/:id/approve
 * @access Private (admin only)
 */
const approveBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    // Find the booking
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Prevent duplicate approval
    if (booking.status === "approved") {
      return res.status(400).json({ message: "Booking is already approved" });
    }

    const previousStatus = booking.status;

    // MODULE 3.1: Re-check for conflicts (only for non-override bookings)
    // This ensures no new conflicting bookings were created since submission
    if (!booking.isConflict) {
      const conflict = await hasConflictForHall(
        booking.hall,
        booking.startTime,
        booking.endTime,
        booking._id  // Exclude this booking from conflict check
      );

      if (conflict) {
        return res.status(409).json({
          success: false,
          status: "rejected",
          message: "Hall is no longer available for this time slot"
        });
      }
    }

    // MODULE 3.2: Handle Priority-Based Override
    // If this is an override booking (higher priority), reject the old booking
    if (booking.isConflict && booking.overriddenBooking) {
      const oldBooking = await Booking.findByIdAndUpdate(
        booking.overriddenBooking,
        {
          status: "rejected",
          rejectionReason: "Overridden by higher priority event"
        }
      );

      // MODULE 4.3: Log rejection of old booking
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

    // Update booking status to approved
    booking.status = "approved";
    booking.rejectionReason = "";
    await booking.save();

    // MODULE 4.3: Create Approval Log Entry
    // This maintains an audit trail of all approval decisions
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

/**
 * MODULE 4.2: Reject a booking request
 * 
 * Rejection Process:
 * 1. Find booking
 * 2. Update status to "rejected"
 * 3. Store rejection reason
 * 4. Create approval log entry (MODULE 4.3: Audit Trail)
 * 
 * @route PATCH /api/bookings/:id/reject
 * @access Private (admin only)
 */
const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const previousStatus = booking.status;

    // Update booking status to rejected
    booking.status = "rejected";
    booking.rejectionReason = reason || "";
    await booking.save();

    // MODULE 4.3: Create Rejection Log Entry
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

/**
 * MODULE 4.3: Get approval logs for a booking
 * 
 * Returns complete audit trail for a booking:
 * - All approval/rejection actions
 * - Who performed each action
 * - When each action occurred
 * - Remarks and reasons
 * 
 * This ensures transparency and accountability in the approval process
 * 
 * @route GET /api/bookings/:id/logs
 * @access Private (admin and booking coordinator)
 */
const getBookingLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await ApprovalLog.find({ booking: id })
      .populate("performedBy", "username role")  // Include admin details
      .sort({ createdAt: -1 });  // Most recent first

    return res.status(200).json(logs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Export all controller functions
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
