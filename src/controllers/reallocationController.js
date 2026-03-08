/**
 * Reallocation Controller
 * 
 * Manages the process of suggesting and accepting alternative halls for users
 * whose original bookings were displaced by a higher-priority override.
 */

const ReallocationRequest = require("../models/reallocationRequest");
const Booking = require("../models/booking");

/**
 * POST /api/reallocation/suggest
 * Sends a reallocation suggestion to a coordinator for a displaced booking.
 */
const sendSuggestion = async (req, res) => {
  try {
    const { bookingId, hallId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Create a record for the suggestion so the coordinator can review it
    const request = await ReallocationRequest.create({
      displacedBooking: bookingId,
      coordinator: booking.coordinator,
      suggestedHall: hallId
    });

    return res.status(201).json({
      success: true,
      message: "Suggestion sent to user",
      request
    });

  } catch (error) {
    console.error("Send Suggestion Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * PATCH /api/reallocation/:id/accept
 * Executed by a coordinator to accept a suggested alternative hall.
 */
const acceptSuggestion = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await ReallocationRequest
      .findById(id)
      .populate("displacedBooking");

    if (!request) {
      return res.status(404).json({ message: "Reallocation request not found" });
    }

    // Update the original booking with the new resource and mark it as approved
    const booking = await Booking.findById(request.displacedBooking);
    booking.resource = request.suggestedHall;
    booking.status = "approved";
    await booking.save();

    // Mark the suggestion request as accepted
    request.status = "accepted";
    await request.save();

    res.json({
      success: true,
      message: "Hall allocated successfully",
      booking
    });

  } catch (error) {
    console.error("Accept Suggestion Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * PATCH /api/reallocation/:id/reject
 * Executed by a coordinator to reject a suggested alternative.
 */
const rejectSuggestion = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await ReallocationRequest.findByIdAndUpdate(
      id,
      { status: "rejected" },
      { new: true }
    );

    res.json({
      success: true,
      message: "Suggestion rejected",
      request
    });

  } catch (error) {
    console.error("Reject Suggestion Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/reallocation/my
 * Retrieves all pending reallocation suggestions for the logged-in coordinator.
 */
const getMyReallocationRequests = async (req, res) => {
  try {
    const requests = await ReallocationRequest
      .find({
        coordinator: req.session.user.userId,
        status: "pending"
      })
      .populate({
        path: "displacedBooking",
        populate: { path: "resource" }
      })
      .populate("suggestedHall")
      .sort({ createdAt: -1 });

    res.json(requests);

  } catch (error) {
    console.error("Get My Reallocations Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  sendSuggestion,
  acceptSuggestion,
  rejectSuggestion,
  getMyReallocationRequests
};
