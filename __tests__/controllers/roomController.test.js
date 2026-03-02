const request = require('supertest');
const express = require('express');
const roomController = require('../../src/controllers/roomController');
const Room = require('../../src/models/Room');

Room.find = jest.fn();
Room.findOne = jest.fn();
Room.create = jest.fn();
Room.findById = jest.fn();
Room.findByIdAndDelete = jest.fn();
Room.deleteMany = jest.fn();
Room.insertMany = jest.fn();

const app = express();
app.use(express.json());

app.get('/rooms', roomController.getRooms);
app.get('/rooms/all', roomController.getAllRooms);
app.post('/rooms', roomController.createRoom);
app.patch('/rooms/:id', roomController.updateRoom);
app.delete('/rooms/:id', roomController.deleteRoom);

describe('Room Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getRooms', () => {
        it('should get active rooms', async () => {
            const mockRooms = [{ name: 'A-101' }];
            Room.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockRooms)
            });

            const res = await request(app).get('/rooms');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockRooms);
        });

        it('should return 500 on error', async () => {
            Room.find.mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error('Test Error'))
            });

            const res = await request(app).get('/rooms');
            expect(res.status).toBe(500);
        });
    });

    describe('getAllRooms', () => {
        it('should get all rooms', async () => {
            const mockRooms = [{ name: 'A-101', isActive: false }, { name: 'B-101', isActive: true }];
            Room.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockRooms)
            });

            const res = await request(app).get('/rooms/all');
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockRooms);
        });
    });

    describe('createRoom', () => {
        it('should create a room', async () => {
            Room.findOne.mockResolvedValue(null);
            Room.create.mockResolvedValue({ name: 'NewRoom', capacity: 50 });

            const res = await request(app).post('/rooms').send({ name: 'NewRoom', capacity: 50 });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('NewRoom');
        });

        it('should return 400 for duplicate name', async () => {
            Room.findOne.mockResolvedValue({ name: 'ExistingRoom' });

            const res = await request(app).post('/rooms').send({ name: 'ExistingRoom', capacity: 50 });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Room with this name already exists');
        });

        it('should return 400 if fields missing', async () => {
            const res = await request(app).post('/rooms').send({ capacity: 50 });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Name and capacity are required');
        });
    });

    describe('updateRoom', () => {
        it('should update a room successfully', async () => {
            const mockRoom = {
                name: 'OldRoom',
                capacity: 50,
                isActive: true,
                save: jest.fn().mockResolvedValue()
            };
            Room.findById.mockResolvedValue(mockRoom);
            Room.findOne.mockResolvedValue(null); // No collision

            const res = await request(app).patch('/rooms/123').send({ name: 'NewName', capacity: 60, isActive: false });
            expect(res.status).toBe(200);
            expect(mockRoom.name).toBe('NewName');
            expect(mockRoom.capacity).toBe(60);
            expect(mockRoom.isActive).toBe(false);
            expect(mockRoom.save).toHaveBeenCalled();
        });

        it('should return 404 if room not found', async () => {
            Room.findById.mockResolvedValue(null);
            const res = await request(app).patch('/rooms/123').send({ name: 'NewName' });
            expect(res.status).toBe(404);
        });

        it('should return 400 if new name collides', async () => {
            const mockRoom = { name: 'OldRoom' };
            Room.findById.mockResolvedValue(mockRoom);
            Room.findOne.mockResolvedValue({ name: 'OtherRoom' }); // Collision

            const res = await request(app).patch('/rooms/123').send({ name: 'OtherRoom' });
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Room with this name already exists');
        });
    });

    describe('deleteRoom', () => {
        it('should delete a room', async () => {
            Room.findByIdAndDelete.mockResolvedValue({ name: 'Room' });
            const res = await request(app).delete('/rooms/123');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Room deleted successfully');
        });

        it('should return 404 if room not found', async () => {
            Room.findByIdAndDelete.mockResolvedValue(null);
            const res = await request(app).delete('/rooms/123');
            expect(res.status).toBe(404);
        });
    });
});
