const mongoose = require('mongoose');

let isDbConnected = false;

// MongoDB connection with better error handling and retry logic
async function connectToDatabase() {
  try {
    console.log("🔄 Attempting to connect to MongoDB...");
    
    // Check if MONGODB_URI is defined
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI environment variable is not defined');
      return null;
    }
    
    // Connect with proper options for replica sets
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // These options help with replica set connections
      retryWrites: true,
      w: 'majority'
    });
    
    console.log("✅ Connected to MongoDB successfully");
    isDbConnected = true;
    
    // Set up connection event handlers
    mongoose.connection.on('disconnected', () => {
      console.log('❌ MongoDB disconnected');
      isDbConnected = false;
      // Try to reconnect
      setTimeout(connectToDatabase, 5000);
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isDbConnected = false;
    });
    
    return mongoose.connection;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    isDbConnected = false;
    
    // Retry connection after 5 seconds
    console.log("🔄 Retrying connection in 5 seconds...");
    setTimeout(connectToDatabase, 5000);
    
    return null;
  }
}

// Export the connection function and connection status
module.exports = {
  connectToDatabase,
  isConnected: () => isDbConnected
};
