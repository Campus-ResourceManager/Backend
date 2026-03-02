const request = require('supertest');
const express = require('express');
const Booking = require('../../src/models/booking');

Booking.aggregate = jest.fn();
Booking.find = jest.fn();

jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
        models: {
            generateContent: jest.fn().mockResolvedValue({
                text: JSON.stringify({
                    recommendations: "Test Recommendations",
                    monopolizationAlerts: "Test Alerts",
                    efficiencyScore: 85
                })
            })
        }
    }))
}));

const forecastingController = require('../../src/controllers/forecastingController');

const app = express();
app.use(express.json());
app.get('/forecasting/demand', forecastingController.getDemandForecast);

describe('Forecasting Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GEMINI_API_KEY = "test-key";
    });

    it('should return 500 if an error occurs', async () => {
        Booking.aggregate.mockRejectedValue(new Error('Test Error'));

        Booking.find.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([])
            })
        });

        const response = await request(app).get('/forecasting/demand');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Failed to generate forecast' });
    });

    it('should calculate forecast and generic insights when no AI key is present', async () => {
        delete process.env.GEMINI_API_KEY;
        const mockAggregatedData = [
            { _id: 1, count: 10 },
            { _id: 2, count: 15 }
        ];
        Booking.aggregate.mockResolvedValue(mockAggregatedData);
        Booking.find.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([])
            })
        });

        const response = await request(app).get('/forecasting/demand');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('forecast');
        expect(response.body).toHaveProperty('insights');
        expect(response.body.insights.efficiencyScore).toBeDefined();
        // Should NOT contain Gemini fallback anymore
        expect(response.body.insights.recommendations).not.toContain("Enable Gemini API");
    });

    it('should calculate forecast and call AI when key is present', async () => {
        process.env.GEMINI_API_KEY = "test-key";
        const mockAggregatedData = [
            { _id: 1, count: 10 }
        ];
        const mockRecentBookings = [
            { hall: "Room A", attendees: 50, facultyDepartment: "CSE" }
        ];

        Booking.aggregate.mockResolvedValue(mockAggregatedData);
        Booking.find.mockReturnValue({
            select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockRecentBookings)
            })
        });

        const response = await request(app).get('/forecasting/demand');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('forecast');
        expect(response.body).toHaveProperty('insights');

        // Assert AI generated values are parsed and passed forward
        expect(response.body.insights.efficiencyScore).toBe(85);
        expect(response.body.insights.recommendations).toBe("Test Recommendations");
        expect(response.body.insights.monopolizationAlerts).toBe("Test Alerts");
    });
});
