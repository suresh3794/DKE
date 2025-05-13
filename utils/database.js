const mongoose = require('mongoose');

let cachedConnection = null;

async function connectToDatabase() {
  if (cachedConnection) {
    console.log('Using cached database connection');
    return cachedConnection;
  }

  // Check if MONGODB_URI is defined
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  try {
    console.log('Attempting to connect to MongoDB...');
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

    console.log('MongoDB connection established successfully');
    cachedConnection = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

module.exports = connectToDatabase;
