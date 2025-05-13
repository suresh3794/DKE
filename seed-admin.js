const mongoose = require('mongoose');
require('./models/User');

const User = mongoose.model('User');

// Connect to MongoDB
mongoose.connect('mongodb+srv://3994suresh:7KbAHTdZmJyhEZ3J@cluster0.5qooyr4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('MongoDB connected successfully');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
    } else {
      // Create admin user
      const adminUser = new User({
        username: 'admin',
        password: 'admin123', // In production, use password hashing
        email: 'admin@dignitykitchen.com',
        role: 'admin'
      });
      
      await adminUser.save();
      console.log('Admin user created successfully');
    }
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
});