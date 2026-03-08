const mongoose = require("mongoose");
const Resource = require("./src/models/resource"); // adjust path if needed

// 🔹 Replace with your actual MongoDB URI
const MONGO_URI = "mongodb://127.0.0.1:27017/campusResourceManagement";

async function seedResources() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");

    // Optional: Clear existing resources
    await Resource.deleteMany({});
    console.log("🧹 Old resources cleared");

    // 🔹 Insert Halls
    await Resource.insertMany([
      { name: "Anugraha Hall", type: "hall", capacity: 100, creditCost: 5 },
      { name: "Sandheepani Hall", type: "hall", capacity: 100, creditCost: 5 },
      { name: "Amriteshwari Hall", type: "hall", capacity: 100, creditCost: 5 },
      { name: "Sudhamani Hall", type: "hall", capacity: 100, creditCost: 5 },
      { name: "Seminar Hall", type: "hall", capacity: 60, creditCost: 5 },
      { name: "Auditorium/Pandal", type: "hall", capacity: 400, creditCost: 5 },
      { name: "Conference Hall", type: "hall", capacity: 60, creditCost: 5 }
    ]);

    console.log("🏢 Halls inserted");

    // 🔹 Insert Classrooms
    const blocks = [
      "Academic Block - 1",
      "Academic Block - 2",
      "Academic Block - 3"
    ];

    const wings = ["A", "B", "C", "D"];
    const classrooms = [];

    for (const block of blocks) {
      for (const wing of wings) {
        for (let floor = 1; floor <= 4; floor++) {
          for (let room = 1; room <= 10; room++) {
            const roomNumber = `${wing}-${floor}${room.toString().padStart(2, "0")}`;

            classrooms.push({
              name: roomNumber,
              type: "classroom",
              block,
              wing,
              floor,
              capacity: wing === "A" || wing === "B" ? 60 : 75,
              creditCost: 1 // Default cost for classrooms
            });
          }
        }
      }
    }

    await Resource.insertMany(classrooms);
    console.log("🏫 Classrooms inserted");

    console.log("🎉 Seeding completed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Error seeding:", error);
    process.exit(1);
  }
}

seedResources();