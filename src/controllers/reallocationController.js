const ReallocationRequest = require("../models/reallocationRequest");
const Booking = require("../models/booking");

const sendSuggestion = async (req, res) => {
  try {

    const { bookingId, hallId } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

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
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const acceptSuggestion = async (req, res) => {
  try {

    const { id } = req.params;

    const request = await ReallocationRequest
      .findById(id)
      .populate("displacedBooking");

    const booking = await Booking.findById(request.displacedBooking);

    booking.resource = request.suggestedHall;
    booking.status = "approved";

    await booking.save();

    request.status = "accepted";
    await request.save();

    res.json({
      success: true,
      message: "Hall allocated successfully",
      booking
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

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
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  sendSuggestion,
  acceptSuggestion,
  rejectSuggestion
};