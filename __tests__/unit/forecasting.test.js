const request = require('supertest');
const express = require('express');

// Hoist mocks
jest.mock('../../src/models/booking', () => ({
    aggregate: jest.fn(),
    find: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }),
    modelName: 'Booking'
}));

const { getDemandForecast } = require('../../src/controllers/forecastingController');
const Booking = require('../../src/models/booking');

// Mock Auth
const mockAuth = (req, res, next) => {
    req.session = { user: { userId: 'admin', username: 'admin', role: 'admin' } };
    next();
};

const app = express();
app.use(express.json());
app.get('/api/forecasting/demand', mockAuth, getDemandForecast);


describe('GET /api/forecasting/demand', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 7-day forecast and algorithmic insights', async () => {
        // Mock aggregate response for forecast (1=Sun, 7=Sat)
        Booking.aggregate.mockResolvedValue([
            { _id: 2, count: 4 }, // Monday: 4 avg
            { _id: 3, count: 8 }  // Tuesday: 8 avg
        ]);

        // Mock find response for algorithmic insights
        const mockRecent = [
            { hall: 'Room A', facultyDepartment: 'CSE', capacity: 50 },
            { hall: 'Room A', facultyDepartment: 'CSE', capacity: 50 },
            { hall: 'Room B', facultyDepartment: 'ECE', capacity: 100 }
        ];

        Booking.find.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(mockRecent)
        });

        const res = await request(app).get('/api/forecasting/demand');

        expect(res.statusCode).toEqual(200);
        expect(res.body.forecast.length).toEqual(7);
        expect(res.body.insights).toBeDefined();
        expect(res.body.insights.recommendations).toMatch(/Room A/); // Should mention top room
        expect(res.body.insights.monopolizationAlerts).toMatch(/CSE/); // Should alert about CSE (2/3 bookings)
        expect(res.body.insights.efficiencyScore).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
        Booking.aggregate.mockRejectedValue(new Error('DB Error'));
        const res = await request(app).get('/api/forecasting/demand');
        expect(res.statusCode).toEqual(500);
    });
});
