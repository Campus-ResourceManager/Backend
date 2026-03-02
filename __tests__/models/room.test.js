const mongoose = require('mongoose');
const Room = require('../../src/models/Room');

// Mock Mongoose just for model validation tests if we don't want a full DB connection yet
// But integration tests need real DB. 
// Let's write these to assume a DB connection is present (handled by setup or just standard mongoose behavior)

describe('Room Model', () => {
    it('should be invalid if name is empty', async () => {
        const room = new Room({ capacity: 10 });
        try {
            await room.validate();
        } catch (error) {
            expect(error.errors.name).toBeDefined();
        }
    });

    it('should be invalid if capacity is less than 1', async () => {
        const room = new Room({ name: "A", capacity: 0 });
        try {
            await room.validate();
        } catch (error) {
            expect(error.errors.capacity).toBeDefined();
        }
    });

    it('should create a valid room', async () => {
        const room = new Room({ name: "Valid Room", capacity: 100 });
        const error = room.validateSync();
        expect(error).toBeUndefined();
        expect(room.name).toBe("Valid Room");
        expect(room.capacity).toBe(100);
    });
});
