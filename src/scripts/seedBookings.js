/**
 * Seed script: Populates 150 realistic bookings with various statuses
 * Usage: node src/scripts/seedBookings.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../models/booking');
const User = require('../models/user');
const Room = require('../models/Room');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-resource';

const eventTitles = [
    'Guest Lecture on Machine Learning',
    'Department Faculty Meeting',
    'CSE Project Presentation',
    'AI Workshop - Introduction to Neural Networks',
    'Annual Sports Day Committee Meeting',
    'Cultural Fest Planning Session',
    'Industry Expert Talk: Cloud Computing',
    'Research Seminar: Quantum Computing',
    'First Year Orientation Program',
    'Alumni Interaction Session',
    'Technical Symposium - TechFest 2026',
    'Environmental Awareness Club Meeting',
    'Entrepreneurship Cell Workshop',
    'IEEE Student Branch Event',
    'Coding Contest Orientation',
    'Cyber Security Workshop',
    'Data Science Bootcamp Day 1',
    'Robotics Club Demonstration',
    'Photography Club Exhibition',
    'Career Guidance Seminar',
    'MBA Case Study Session',
    'Physics Lab Introduction',
    'Chemistry Department Seminar',
    'Math Olympiad Preparation',
    'English Language Communication Workshop',
    'Student Mentoring Program',
    'Hackathon Kickoff Meeting',
    'Smart India Hackathon Internal Round',
    'GATE Preparation Workshop',
    'Placement Training - Aptitude Skills',
    'Resume Writing Workshop',
    'Mock Interview Session',
    'Research Methodology Workshop',
    'Design Thinking Workshop',
    'Entrepreneurship Bootcamp',
    'NSS Annual Camp Planning',
    'Blood Donation Camp Coordination',
    'Technical Paper Writing Seminar',
    'Project Expo Preparation',
    'Final Year Project Demo Day',
];

const faculties = [
    { name: 'Dr. Rajesh Kumar', dept: 'CSE', designation: 'Professor', email: 'rajesh.kumar@amrita.edu' },
    { name: 'Dr. Priya Sharma', dept: 'ECE', designation: 'Associate Professor', email: 'priya.sharma@amrita.edu' },
    { name: 'Dr. Anand Krishnan', dept: 'EEE', designation: 'Professor', email: 'anand.k@amrita.edu' },
    { name: 'Dr. Meera Nair', dept: 'ME', designation: 'Assistant Professor', email: 'meera.nair@amrita.edu' },
    { name: 'Dr. Suresh Babu', dept: 'CE', designation: 'Professor', email: 'suresh.babu@amrita.edu' },
    { name: 'Prof. Kavitha Reddy', dept: 'IT', designation: 'Associate Professor', email: 'kavitha.r@amrita.edu' },
    { name: 'Dr. Arun Das', dept: 'AIDS', designation: 'Professor', email: 'arun.das@amrita.edu' },
    { name: 'Prof. Lakshmi Patel', dept: 'AIML', designation: 'Assistant Professor', email: 'lakshmi.p@amrita.edu' },
    { name: 'Dr. Venkat Rao', dept: 'CSE', designation: 'Professor', email: 'venkat.rao@amrita.edu' },
    { name: 'Prof. Divya Menon', dept: 'CSBS', designation: 'Associate Professor', email: 'divya.m@amrita.edu' },
    { name: 'Dr. Ravi Chandran', dept: 'ECE', designation: 'Professor', email: 'ravi.c@amrita.edu' },
    { name: 'Dr. Sunitha George', dept: 'CSE', designation: 'Assistant Professor', email: 'sunitha.g@amrita.edu' },
];

const eventDescriptions = [
    'Interactive session covering fundamental and advanced topics with industry experts.',
    'Annual planning meeting to discuss upcoming events and academic activities.',
    'Presentations by students on their final year project developments and findings.',
    'Hands-on workshop with live coding demonstrations and practical exercises.',
    'Coordination meeting for organizing the inter-department sports competition.',
    'Planning session for the annual cultural festival including performance schedules.',
    'Expert from leading tech company sharing insights on modern cloud architectures.',
    'Deep dive into cutting-edge research on quantum computing applications.',
    'Welcome program for incoming freshers including campus tour and introductions.',
    'Networking event connecting students with alumni from top companies.',
];

const rejectionReasons = [
    'Hall already reserved for a department exam',
    'Insufficient notice period provided',
    'Event conflicts with Campus Maintenance Schedule',
    'Room capacity insufficient for requested attendees',
    'Room unavailable during exam season',
];

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function seedBookings() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Get coordinators
        const coordinators = await User.find({ role: 'coordinator', status: 'active' });
        if (coordinators.length === 0) {
            console.error('No active coordinators found. Please create coordinator accounts first via the app.');
            process.exit(1);
        }

        // Get rooms
        const rooms = await Room.find({ isActive: true });
        if (rooms.length === 0) {
            console.error('No active rooms found. Please add rooms via admin panel first.');
            process.exit(1);
        }

        console.log(`Found ${coordinators.length} coordinators and ${rooms.length} rooms`);

        // Clear existing bookings
        const existingCount = await Booking.countDocuments();
        if (existingCount > 0) {
            await Booking.deleteMany({});
            console.log(`Cleared ${existingCount} existing bookings`);
        }

        const bookings = [];
        const now = new Date();

        // Time slots: common university hours
        const timeSlots = [
            { start: '08:00', end: '09:00' },
            { start: '09:00', end: '10:00' },
            { start: '09:00', end: '11:00' },
            { start: '10:00', end: '11:00' },
            { start: '10:00', end: '12:00' },
            { start: '11:00', end: '12:00' },
            { start: '11:00', end: '13:00' },
            { start: '13:00', end: '14:00' },
            { start: '13:00', end: '15:00' },
            { start: '14:00', end: '15:00' },
            { start: '14:00', end: '16:00' },
            { start: '15:00', end: '16:00' },
            { start: '15:00', end: '17:00' },
            { start: '16:00', end: '17:00' },
            { start: '16:00', end: '18:00' },
        ];

        // Generate bookings for past 90 days and next 30 days
        const statusDistribution = ['approved', 'approved', 'approved', 'approved', 'pending', 'pending', 'rejected'];

        let count = 0;
        const targetCount = 150;

        // Track used room+date+time combos to avoid absolute duplicates
        const usedSlots = new Set();

        while (count < targetCount) {
            const daysOffset = randomBetween(-90, 30);
            const bookingDate = new Date(now);
            bookingDate.setDate(bookingDate.getDate() + daysOffset);
            const dateStr = bookingDate.toISOString().split('T')[0];

            const room = randomItem(rooms);
            const timeSlot = randomItem(timeSlots);
            const slotKey = `${room.name}_${dateStr}_${timeSlot.start}`;

            if (usedSlots.has(slotKey)) continue;
            usedSlots.add(slotKey);

            const startTime = new Date(`${dateStr}T${timeSlot.start}:00`);
            const endTime = new Date(`${dateStr}T${timeSlot.end}:00`);

            // Booking in past should not be "pending" (only approved or rejected)
            let status = randomItem(statusDistribution);
            if (daysOffset < -7 && status === 'pending') {
                status = Math.random() > 0.3 ? 'approved' : 'rejected';
            }
            // Future bookings are mostly pending with some approved
            if (daysOffset > 7) {
                status = randomItem(['pending', 'pending', 'approved']);
            }

            const faculty = randomItem(faculties);
            const coordinator = randomItem(coordinators);
            const attendees = randomBetween(Math.floor(room.capacity * 0.3), Math.min(room.capacity, 250));

            const booking = {
                coordinator: coordinator._id,
                facultyName: faculty.name,
                facultyDepartment: faculty.dept,
                facultyDesignation: faculty.designation,
                facultyEmail: faculty.email,
                eventTitle: randomItem(eventTitles),
                eventDescription: randomItem(eventDescriptions),
                hall: room.name,
                capacity: attendees,
                startTime,
                endTime,
                status,
                rejectionReason: status === 'rejected' ? randomItem(rejectionReasons) : '',
                isConflict: false,
                conflictReason: '',
                overriddenBooking: null,
                createdAt: new Date(startTime.getTime() - randomBetween(1, 14) * 24 * 60 * 60 * 1000), // Created 1-14 days before event
            };

            bookings.push(booking);
            count++;
        }

        await Booking.insertMany(bookings, { timestamps: false });

        const approved = bookings.filter(b => b.status === 'approved').length;
        const pending = bookings.filter(b => b.status === 'pending').length;
        const rejected = bookings.filter(b => b.status === 'rejected').length;

        console.log(`\n✅ Successfully seeded ${bookings.length} bookings:`);
        console.log(`   ✓ Approved: ${approved}`);
        console.log(`   ⏳ Pending:  ${pending}`);
        console.log(`   ✗ Rejected: ${rejected}`);
        console.log(`\nRooms used: ${[...new Set(bookings.map(b => b.hall))].join(', ')}`);

        await mongoose.disconnect();
        console.log('\nDone! Disconnected from MongoDB.');
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedBookings();
