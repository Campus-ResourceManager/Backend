const cron = require("node-cron");
const nodemailer = require("nodemailer");
const Booking = require("../models/booking");
const Room = require("../models/Room");
require("dotenv").config();

// Configure Nodemailer (ensure env vars are set)
const transporter = nodemailer.createTransport({
    service: "gmail", // Or use your SMTP provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const checkUnderutilization = async () => {
    console.log("Running underutilization check...");
    try {
        const rooms = await Room.find({ isActive: true });
        const alerts = [];

        // Analyze last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        for (const room of rooms) {
            // Count approved bookings in last 7 days
            const bookingsCount = await Booking.countDocuments({
                hall: room.name,
                status: "approved",
                startTime: { $gte: sevenDaysAgo }
            });

            // Heuristic: If < 2 bookings in 7 days, flag it
            // Real logic would use hours booked / total available hours
            if (bookingsCount < 2) {
                alerts.push(`${room.name}: Only ${bookingsCount} bookings in last 7 days.`);
            }
        }

        if (alerts.length > 0) {
            console.log("Underutilization detected:", alerts);

            if (process.env.EMAIL_USER) {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER, // Send to admin
                    subject: "Campus Resource Manager - Underutilization Alert",
                    text: `The following rooms have been underutilized in the last week:\n\n${alerts.join("\n")}\n\nPlease consider promoting these spaces.`
                };

                await transporter.sendMail(mailOptions);
                console.log("Alert email sent.");
            } else {
                console.log("Skipping email: EMAIL_USER not set.");
            }
        } else {
            console.log("No underutilization detected.");
        }

    } catch (error) {
        console.error("Error in alert service:", error);
    }
};

// Initialize Cron Job
const initAlertService = () => {
    // Run every day at 9:00 AM
    cron.schedule("0 9 * * *", checkUnderutilization);
    console.log("Underutilization alert service scheduled (Daily at 9:00 AM).");
};

module.exports = { initAlertService, checkUnderutilization }; // Export check fn for manual triggering if needed
