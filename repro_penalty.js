const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

// Mocking models
const Booking = require("./src/models/booking");
const FacultyProfile = require("./src/models/facultyProfile");
const Resource = require("./src/models/resource");

async function runRepro() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const email = "bala24325@gmail.com";
        let profile = await FacultyProfile.findOne({ email });

        if (!profile) {
            console.error("Profile not found for " + email);
            process.exit(1);
        }

        console.log("Initial Priority Score:", profile.priorityScore);
        console.log("Initial Monthly Quota:", profile.monthlyQuota);

        // 1. Temporarily lower the quota to 2 for testing
        const originalQuota = profile.monthlyQuota;
        profile.monthlyQuota = 2;
        await profile.save();
        console.log("Updated Monthly Quota to 2 for testing");

        // 2. Mock a booking that exceeds the quota
        // We'll simulate the used credits calculation
        // Let's say we have 1 already approved (cost 1)
        // And we are approving another one (cost 2)
        // Total = 3, which is > 2.

        const usedCredits = 1;
        const proposedCost = 2;

        console.log(`Simulating: usedCredits (${usedCredits}) + proposedCost (${proposedCost}) = 3`);
        console.log(`Threshold: monthlyQuota (${profile.monthlyQuota})`);

        if (usedCredits + proposedCost > profile.monthlyQuota) {
            const excess = (usedCredits + proposedCost) - profile.monthlyQuota;
            const penaltyAmount = 10 + Math.floor(excess / 5) * 5;

            console.log("Excess:", excess);
            console.log("Penalty Amount:", penaltyAmount);

            profile.priorityScore = Math.max(0, profile.priorityScore - penaltyAmount);
            await profile.save();
            console.log("New Priority Score:", profile.priorityScore);
        } else {
            console.log("Quota not exceeded, no penalty applied.");
        }

        // Reset to original for cleanup (though this is a repro script)
        profile.monthlyQuota = originalQuota;
        await profile.save();
        console.log("Reset Monthly Quota to", originalQuota);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runRepro();
