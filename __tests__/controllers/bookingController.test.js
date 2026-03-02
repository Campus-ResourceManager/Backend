const request = require('supertest');
const express = require('express');
const Booking = require('../../src/models/booking');
const Room = require('../../src/models/Room');

Booking.findOne = jest.fn();
Room.find = jest.fn();

jest.mock('../../src/controllers/auditLogController', () => ({
    createLog: jest.fn()
}));
jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
            generateContent: jest.fn().mockResolvedValue({
                text: "AI generated explanation."
            })
        }
    }))
}));

// Require controller AFTER mock
const bookingController = require('../../src/controllers/bookingController');

const app = express();
app.use(express.json());
// Assuming user info is added to req structure in standard app router
app.post('/bookings', (req, res, next) => {
    req.session = { user: { userId: 'mockUserId', username: 'faculty', role: 'faculty' } };
    next();
}, bookingController.createBooking);

app.post('/bookings/recommend', bookingController.recommendRooms);

describe('Booking Controller', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createBooking', () => {
        const validPayload = {
            facultyName: "Dr. Smith",
            eventTitle: "Meeting",
            hall: "Room A",
            capacity: 50,
            date: "2027-10-10", // Future date
            startTime: "10:00",
            endTime: "11:00"
        };

        it('should return 400 if required fields are missing', async () => {
            const res = await request(app).post('/bookings').send({});
            expect(res.status).toBe(400);
            expect(res.body.message).toContain("are required");
        });

        it('should return 400 for past dates', async () => {
            const res = await request(app).post('/bookings').send({
                ...validPayload,
                date: "2020-01-01" // past date
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Cannot create booking for a time slot that has already passed");
        });

        it('should detect conflicts and return 409', async () => {
            Booking.findOne.mockResolvedValue({ _id: 'conflictId' }); // mock finding a conflict

            const res = await request(app).post('/bookings').send(validPayload);
            expect(res.status).toBe(409);
            expect(res.body.conflict).toBe(true);
        });

        it('should successfully create a pending booking', async () => {
            Booking.findOne.mockResolvedValue(null); // No conflicts

            // Mock create instead of save
            Booking.create = jest.fn().mockResolvedValue({
                _id: 'newBookingId',
                status: 'pending'
            });

            const res = await request(app).post('/bookings').send(validPayload);
            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Booking request submitted and is pending admin approval");
        });
    });

    describe('recommendRooms', () => {
        const payload = {
            date: "2025-10-10",
            startTime: "10:00",
            endTime: "11:00",
            attendees: 50
        };

        it('should return 400 if missing fields', async () => {
            const res = await request(app).post('/bookings/recommend').send({});
            expect(res.status).toBe(400);
        });

        it('should return empty if no eligible rooms', async () => {
            Room.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

            const res = await request(app).post('/bookings/recommend').send(payload);
            expect(res.status).toBe(200);
            expect(res.body.rooms).toEqual([]);
        });

        it('should check conflicts and return available rooms with AI message', async () => {
            process.env.GEMINI_API_KEY = "test";

            const mockRooms = [
                { name: 'Room B', capacity: 60, toObject: () => ({ name: 'Room B', capacity: 60 }) },
                { name: 'Room C', capacity: 100, toObject: () => ({ name: 'Room C', capacity: 100 }) }
            ];
            Room.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(mockRooms) });
            Booking.countDocuments = jest.fn().mockResolvedValue(2); // Mock frequency check

            // First DB conflict check returns a conflict, second check returns null
            Booking.findOne
                .mockResolvedValueOnce({ _id: 'conflict' }) // Room B has conflict
                .mockResolvedValueOnce(null); // Room C is free

            const res = await request(app).post('/bookings/recommend').send(payload);

            expect(res.status).toBe(200);
            expect(res.body.rooms.length).toBe(1);
            expect(res.body.rooms[0].name).toBe('Room C');
            expect(res.body.aiMessage).toMatch(/Room C/); // Algorithmic message mentions top pick
        });
    });
});
