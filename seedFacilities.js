const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Facility = require("./src/models/facility");

dotenv.config();

const blocks = ["A", "B", "C", "D"];
const floors = [
    { level: 0, code: "1", capacity: 70 }, // Ground floor 101-110
    { level: 1, code: "2", capacity: 70 }, // 1st floor 201-210
    { level: 2, code: "3", capacity: 70 }, // 2nd floor 301-310
    { level: 3, code: "4", capacity: 70 }  // 3rd floor 401-410
];

const generateClassrooms = () => {
    let rooms = [];
    blocks.forEach(block => {
        floors.forEach(floor => {
            for (let i = 1; i <= 10; i++) {
                const roomNumber = `${floor.code}${i.toString().padStart(2, '0')}`; // e.g., 101, 205
                rooms.push({
                    name: `${block}-${roomNumber}`,
                    location: `Block ${block} - Floor ${floor.level}`,
                    capacity: floor.capacity,
                    equipment: ["Whiteboard", "Projector"],
                    status: "Active"
                });
            }
        });
    });
    return rooms;
};

const specialHalls = [
    { name: "Anugraha Hall", location: "Main Block", capacity: 100, equipment: ["Stage", "Sound System", "Projector", "AC"], status: "Active" },
    { name: "Seminar Hall 1", location: "Main Block", capacity: 100, equipment: ["Stage", "Sound System", "Projector", "AC"], status: "Active" },
    { name: "Seminar Hall 2", location: "Main Block", capacity: 75, equipment: ["Stage", "Sound System", "Projector", "AC"], status: "Active" },
    { name: "Seminar Hall 3", location: "Main Block", capacity: 50, equipment: ["Stage", "Sound System", "Projector", "AC"], status: "Active" },
    { name: "Amriteswari Hall", location: "Main Block", capacity: 200, equipment: ["Stage", "Sound System", "Lighting", "AC"], status: "Active" },
    { name: "Pandal", location: "Outdoor", capacity: 500, equipment: ["Stage", "Sound System"], status: "Active" }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Clear existing facilities
        await Facility.deleteMany({});
        console.log("Cleared existing facilities");

        const classrooms = generateClassrooms();
        const allFacilities = [...classrooms, ...specialHalls];

        await Facility.insertMany(allFacilities);
        console.log(`Seeded ${allFacilities.length} facilities successfully`);

        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
};

seedDB();
