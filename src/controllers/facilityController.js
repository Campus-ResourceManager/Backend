const Facility = require("../models/facility");

// GET /api/facilities
// Get all facilities (can filter by minCapacity, location)
const getAllFacilities = async (req, res) => {
    try {
        const { minCapacity, location } = req.query;

        const query = { status: "Active" };

        if (minCapacity) {
            query.capacity = { $gte: Number(minCapacity) };
        }

        if (location) {
            query.location = { $regex: location, $options: "i" };
        }

        const facilities = await Facility.find(query).sort({ name: 1 });
        return res.status(200).json(facilities);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /api/facilities/:id
const getFacilityById = async (req, res) => {
    try {
        const facility = await Facility.findById(req.params.id);
        if (!facility) {
            return res.status(404).json({ message: "Facility not found" });
        }
        return res.status(200).json(facility);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

// POST /api/facilities (Admin only)
const createFacility = async (req, res) => {
    try {
        const { name, location, capacity, equipment, description } = req.body;

        if (!name || !capacity || !location) {
            return res.status(400).json({ message: "Name, capacity, and location are required" });
        }

        const existing = await Facility.findOne({ name });
        if (existing) {
            return res.status(400).json({ message: "Facility with this name already exists" });
        }

        const facility = await Facility.create({
            name,
            location,
            capacity,
            equipment: equipment || [],
            description,
            status: "Active"
        });

        return res.status(201).json({
            success: true,
            message: "Facility created successfully",
            facility
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

// PATCH /api/facilities/:id (Admin only)
const updateFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const facility = await Facility.findByIdAndUpdate(id, updates, { new: true });

        if (!facility) {
            return res.status(404).json({ message: "Facility not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Facility updated",
            facility
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

// DELETE /api/facilities/:id (Admin only)
const deleteFacility = async (req, res) => {
    try {
        const { id } = req.params;
        const facility = await Facility.findByIdAndDelete(id);

        if (!facility) {
            return res.status(404).json({ message: "Facility not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Facility deleted"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getAllFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility
};
