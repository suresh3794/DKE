const mongoose = require('mongoose');

let cachedConnection = null;

async function connectToDatabase() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using cached database connection');
    return cachedConnection;
  }

  // Check if MONGODB_URI is defined
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is not defined');
    return null;
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    
    // Disconnect if there's a stale connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    // Add serverless-friendly options
    const connection = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increase timeout further
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      // Add these for serverless environments
      bufferCommands: false, // Disable buffering for serverless
      autoCreate: false      // Don't auto-create collections
    });

    // Add connection error handler
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error after initial connection:', err);
    });

    // Add disconnection handler
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      cachedConnection = null;
    });

    console.log('MongoDB connection established successfully');
    cachedConnection = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return null; // Return null instead of throwing
  }
}

module.exports = connectToDatabase;
