const Room = require("../models/Room");

// Get all rooms (active only)
const getRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ isActive: true }).sort({ name: 1 });
        res.status(200).json(rooms);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
};

// Get ALL rooms including inactive (Admin only)
const getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find().sort({ name: 1 });
        res.status(200).json(rooms);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
};

// Create a new room (Admin only)
const createRoom = async (req, res) => {
    const { name, capacity } = req.body;

    if (!name || !capacity) {
        return res.status(400).json({ error: "Name and capacity are required" });
    }

    try {
        const existingRoom = await Room.findOne({ name });
        if (existingRoom) {
            return res.status(400).json({ error: "Room with this name already exists" });
        }

        const room = await Room.create({ name, capacity: parseInt(capacity) });
        res.status(201).json(room);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update a room (Admin only)
const updateRoom = async (req, res) => {
    const { id } = req.params;
    const { name, capacity, isActive } = req.body;

    try {
        const room = await Room.findById(id);
        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }

        // Check name uniqueness if name is being changed
        if (name && name !== room.name) {
            const existing = await Room.findOne({ name });
            if (existing) {
                return res.status(400).json({ error: "Room with this name already exists" });
            }
        }

        if (name !== undefined) room.name = name;
        if (capacity !== undefined) room.capacity = parseInt(capacity);
        if (isActive !== undefined) room.isActive = isActive;

        await room.save();
        res.status(200).json(room);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete a room permanently (Admin only)
const deleteRoom = async (req, res) => {
    const { id } = req.params;
    try {
        const room = await Room.findByIdAndDelete(id);
        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }
        res.status(200).json({ message: "Room deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Seed initial rooms (Helper)
const seedRooms = async (req, res) => {
    const blocks = ["A", "B", "C", "D"];
    const floors = [1, 2, 3, 4]; // Ground=1xx, 1st=2xx, 2nd=3xx, 3rd=4xx
    const roomsPerFloor = [1, 2, 3, 4, 5];

    const rooms = [];

    // Generate A-101 to D-405 (4 blocks × 4 floors × 5 rooms)
    for (const block of blocks) {
        for (const floor of floors) {
            for (const room of roomsPerFloor) {
                const roomNumber = floor * 100 + room;
                rooms.push({ name: `${block}-${roomNumber}`, capacity: 70 });
            }
        }
    }

    // Seminar Halls
    rooms.push({ name: "Seminar Hall A", capacity: 70 });
    rooms.push({ name: "Seminar Hall B", capacity: 70 });

    // Main Auditorium
    rooms.push({ name: "Main Auditorium", capacity: 70 });

    // Conference Labs with varying capacities
    const labCapacities = [50, 60, 70, 80, 90];
    for (let i = 1; i <= 5; i++) {
        rooms.push({ name: `Conference Lab ${i}`, capacity: labCapacities[i - 1] });
    }

    try {
        await Room.deleteMany({}); // Clear all existing rooms before seeding
        const createdRooms = await Room.insertMany(rooms);
        res.status(201).json({ message: `Seeded ${createdRooms.length} rooms successfully`, rooms: createdRooms });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getRooms,
    getAllRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    seedRooms
};

