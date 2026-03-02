const request = require('supertest');
const express = require('express');
const { getAuditLogs, createLog } = require('../../src/controllers/auditLogController');
const AuditLog = require('../../src/models/AuditLog');

AuditLog.find = jest.fn();
AuditLog.create = jest.fn();

const app = express();
app.use(express.json());
app.get('/audit-logs', getAuditLogs);

describe('Audit Log Controller', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAuditLogs', () => {
        it('should return 500 if an error occurs', async () => {
            AuditLog.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        limit: jest.fn().mockRejectedValue(new Error('Test Error'))
                    })
                })
            });

            const res = await request(app).get('/audit-logs');
            expect(res.status).toBe(500);
            expect(res.body.message).toBe("Server error");
        });

        it('should correctly query with filters', async () => {
            const mockLogs = [{ action: 'LOGIN' }];
            const limitMock = jest.fn().mockResolvedValue(mockLogs);
            const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
            const populateMock = jest.fn().mockReturnValue({ sort: sortMock });

            AuditLog.find.mockReturnValue({ populate: populateMock });

            const res = await request(app).get('/audit-logs?username=test&action=LOGIN&startDate=2025-01-01');

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockLogs);

            // Check that query was built correctly
            expect(AuditLog.find).toHaveBeenCalledWith(expect.objectContaining({
                username: expect.anything(),
                action: 'LOGIN',
                createdAt: expect.anything()
            }));
            expect(populateMock).toHaveBeenCalledWith('user', 'username role');
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
            expect(limitMock).toHaveBeenCalledWith(500);
        });
    });

    describe('createLog', () => {
        it('should create an audit log successfully without returning a response', async () => {
            AuditLog.create.mockResolvedValue({});

            await createLog('userId', 'username', 'ACTION', 'User', 'targetId', 'details');

            expect(AuditLog.create).toHaveBeenCalledWith({
                user: 'userId',
                username: 'username',
                action: 'ACTION',
                targetType: 'User',
                targetId: 'targetId',
                details: 'details'
            });
        });

        it('should catch errors but not crash', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            AuditLog.create.mockRejectedValue(new Error("Test error"));

            await createLog('userId', 'username', 'ACTION', 'User', 'targetId', 'details');

            expect(consoleSpy).toHaveBeenCalledWith("Error creating audit log:", expect.any(Error));
            consoleSpy.mockRestore();
        });
    });
});
