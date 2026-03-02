const request = require('supertest');
const express = require('express');

// Hoist mocks
jest.mock('../../src/models/Room', () => ({
    find: jest.fn(),
    modelName: 'Room'
}));
jest.mock('../../src/models/booking', () => ({
    findOne: jest.fn(),
    modelName: 'Booking'
}));

const { recommendRooms } = require('../../src/controllers/bookingController');
// Import mocked models to configure them in tests
const Room = require('../../src/models/Room');
const Booking = require('../../src/models/booking');

// Mock Auth Middleware
const mockAuth = (req, res, next) => {
    req.session = { user: { userId: '123', username: 'testuser', role: 'coordinator' } };
    next();
};

const app = express();
app.use(express.json());
app.post('/api/bookings/recommend', mockAuth, recommendRooms);


describe('POST /api/bookings/recommend', () => {
    beforeEach(() => {
        delete process.env.GEMINI_API_KEY;
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return eligible rooms when no conflicts exist', async () => {
        const mockRooms = [
            { name: 'Room A', capacity: 50, isActive: true, toObject: () => ({ name: 'Room A', capacity: 50, isActive: true }) },
            { name: 'Room B', capacity: 100, isActive: true, toObject: () => ({ name: 'Room B', capacity: 100, isActive: true }) }
        ];

        // Mock Room.find().sort() chain
        Room.find.mockImplementation(() => ({
            sort: jest.fn().mockResolvedValue(mockRooms)
        }));

        // Mock Booking.countDocuments for frequency check
        Booking.countDocuments = jest.fn().mockResolvedValue(0);

        // Mock Booking.findOne to return null (no conflict)
        Booking.findOne.mockResolvedValue(null);

        const res = await request(app)
            .post('/api/bookings/recommend')
            .send({
                date: '2025-01-01',
                startTime: '10:00',
                endTime: '12:00',
                attendees: 30
            });

        if (res.statusCode !== 200) {
            console.log("Error Body:", res.body);
        }

        expect(res.statusCode).toEqual(200);
        expect(res.body.rooms.length).toEqual(2);
        expect(res.body.rooms[0].name).toEqual('Room A');
    });

    it('should filter out rooms with conflicts', async () => {
        const mockRooms = [
            { name: 'Room A', capacity: 50, isActive: true, toObject: () => ({ name: 'Room A', capacity: 50, isActive: true }) },
            { name: 'Room B', capacity: 100, isActive: true, toObject: () => ({ name: 'Room B', capacity: 100, isActive: true }) }
        ];

        Room.find.mockImplementation(() => ({
            sort: jest.fn().mockResolvedValue(mockRooms)
        }));

        // Mock Conflict: First call (Room A) returns conflict, Second call (Room B) returns null
        Booking.findOne
            .mockResolvedValueOnce({ _id: 'conflict' }) // Room A has conflict
            .mockResolvedValueOnce(null);               // Room B is free

        // Mock Booking.countDocuments for frequency check
        Booking.countDocuments = jest.fn().mockResolvedValue(0);

        const res = await request(app)
            .post('/api/bookings/recommend')
            .send({
                date: '2025-01-01',
                startTime: '10:00',
                endTime: '12:00',
                attendees: 30
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.rooms.length).toEqual(1);
        expect(res.body.rooms[0].name).toEqual('Room B');
    });

    it('should return 400 if fields are missing', async () => {
        const res = await request(app)
            .post('/api/bookings/recommend')
            .send({ Attendees: 30 }); // Missing date/time

        expect(res.statusCode).toEqual(400);
    });
});
