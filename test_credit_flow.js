const mongoose = require("mongoose");
const Booking = require("./src/models/booking");
const FacultyProfile = require("./src/models/facultyProfile");
const Resource = require("./src/models/resource");
const bookingController = require("./src/controllers/bookingController");
require("dotenv").config();

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // 1. Setup Test Data
        const testEmail = "test_faculty@example.com";
        await FacultyProfile.deleteMany({ email: testEmail });
        await Booking.deleteMany({ facultyEmail: testEmail });

        const profile = await FacultyProfile.create({
            email: testEmail,
            name: "Test Faculty",
            monthlyQuota: 10,
            priorityScore: 100
        });

        const resource = await Resource.findOne() || await Resource.create({
            name: "Test Hall",
            type: "hall",
            capacity: 50,
            creditCost: 15
        });

        console.log("Setup complete. Quota: 10, Proposed Cost: 15");

        // 2. Mock Request and Response for createBooking
        const reqCreate = {
            body: {
                facultyName: "Test Faculty",
                facultyEmail: testEmail,
                eventTitle: "Over Quota Event",
                resourceId: resource._id,
                date: "2026-03-10",
                startTime: "10:00",
                endTime: "12:00"
            },
            session: { user: { userId: new mongoose.Types.ObjectId() } }
        };

        let statusValue = 0;
        let jsonValue = null;
        const resMock = {
            status: (s) => { statusValue = s; return resMock; },
            json: (j) => { jsonValue = j; return resMock; }
        };

        console.log("--- Testing createBooking (Should NOT subtract points) ---");
        await bookingController.createBooking(reqCreate, resMock);

        const profileAfterCreate = await FacultyProfile.findOne({ email: testEmail });
        console.log("Priority Score after createBooking:", profileAfterCreate.priorityScore);
        if (profileAfterCreate.priorityScore === 100) {
            console.log("✅ Success: Score NOT reduced on request.");
        } else {
            console.log("❌ Failure: Score WAS reduced on request.");
        }

        const bookingId = jsonValue.booking._id;

        // 3. Mock Request and Response for approveBooking
        console.log("--- Testing approveBooking (Should subtract points) ---");
        await bookingController.approveBooking({ params: { id: bookingId } }, resMock);

        const profileAfterApprove = await FacultyProfile.findOne({ email: testEmail });
        console.log("Priority Score after approveBooking:", profileAfterApprove.priorityScore);
        if (profileAfterApprove.priorityScore < 100) {
            console.log("✅ Success: Score WAS reduced on approval.");
        } else {
            console.log("❌ Failure: Score NOT reduced on approval.");
        }

        // 4. Cleanup
        await FacultyProfile.deleteMany({ email: testEmail });
        await Booking.deleteMany({ facultyEmail: testEmail });
        console.log("Test data cleaned up.");

        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err);
        process.exit(1);
    }
}

runTest();
