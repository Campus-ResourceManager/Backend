const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user');
require('dotenv').config();

const usersToCreate = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    status: 'active'
  },
  {
    username: 'student1',
    password: 'student123',
    role: 'coordinator',
    status: 'active'
  },
  {
    username: 'student2',
    password: 'student234',
    role: 'coordinator',
    status: 'active'
  }
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    for (const userData of usersToCreate) {
      const existingUser = await User.findOne({ username: userData.username });
      
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = new User({
          username: userData.username,
          password: hashedPassword,
          role: userData.role,
          status: userData.status
        });
        
        await user.save();
        console.log(`${userData.role} user created: ${userData.username}`);
      } else {
        console.log(`${userData.role} user already exists: ${userData.username}`);
      }
    }
    
    usersToCreate.forEach(u => {
      console.log(`${u.role.toUpperCase()}: ${u.username} / ${u.password}`);
    });
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });