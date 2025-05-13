// Load environment variables first, before any other imports
require('dotenv').config();

try {
  // Test Cloudinary configuration
  const { cloudinary } = require('./config/cloudinary');
  console.log("Cloudinary configuration verified successfully");
} catch (error) {
  console.error("Cloudinary configuration error:", error.message);
  console.log("Check your Cloudinary environment variables");
}

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const { connectToDatabase, isConnected } = require('./utils/database');
const { cloudinary } = require('./config/cloudinary');

// Set strictQuery to suppress deprecation warning
mongoose.set('strictQuery', true);

// Initialize app
const app = express();

// Load all models regardless of connection status
// This ensures schemas are registered even if DB connection fails
require('./models/User');
require('./models/Gallery');
require('./models/Product');
require('./models/Testimonial');
require('./models/Contact');
require('./models/Setting');

// MongoDB connection with better error handling
connectToDatabase()
  .then((connection) => {
    if (connection) {
      console.log('MongoDB connected successfully');
      setupRoutes();
    } else {
      console.log('Failed to connect to MongoDB, app will run with limited functionality');
      setupRoutes();
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Check that your .env file exists and contains MONGODB_URI');
    console.log('Starting app without database connection...');
    setupRoutes();
  });

// Add middleware to check connection status on each request
app.use((req, res, next) => {
  // If database is disconnected, try to reconnect
  if (!isConnected() && mongoose.connection.readyState !== 1) {
    console.log('Database not connected, attempting to reconnect...');
    connectToDatabase().catch(err => {
      console.error('Failed to reconnect to database:', err);
    });
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Use a more production-ready session store if MongoDB is connected
if (mongoose.connection.readyState === 1) {
  const MongoStore = require('connect-mongo');
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60 // 14 days
    })
  }));
} else {
  // Fallback to memory store with warning
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true
  }));
}

// Set view engine with absolute path
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Add debug logging
console.log('Current directory:', __dirname);
console.log('Views directory:', path.join(__dirname, 'views'));
console.log('Files in views directory:', require('fs').readdirSync(path.join(__dirname, 'views')));

// Log Cloudinary configuration status
console.log("Cloudinary configuration:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "✓ Set" : "✗ Missing",
  api_key: process.env.CLOUDINARY_API_KEY ? "✓ Set" : "✗ Missing",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "✓ Set" : "✗ Missing"
});

// Verify Cloudinary configuration
try {
  const cloudConfig = cloudinary.config();
  if (!cloudConfig.cloud_name || !cloudConfig.api_key || !cloudConfig.api_secret) {
    console.warn("⚠️ Incomplete Cloudinary configuration. Image uploads may not work.");
  } else {
    console.log("✅ Cloudinary configured successfully");
  }
} catch (error) {
  console.error("❌ Error verifying Cloudinary configuration:", error);
}

function useDefaultSettings(res) {
  res.locals.settings = {
    siteName: 'Dignity Kitchen',
    siteDescription: 'Kitchen Equipment Supplier',
    contactEmail: 'info@example.com',
    contactPhone: '+1234567890',
    address: 'Default Address'
  };
}

// Function to set up routes and models after DB connection
function setupRoutes() {
  try {
    // Make settings available globally - with better error handling
    app.use(async (req, res, next) => {
      try {
        // Make sure database is connected before querying
        if (!isConnected() || mongoose.connection.readyState !== 1) {
          console.log('Database not connected, using default settings');
          useDefaultSettings(res);
          return next();
        }
        
        // Get settings
        try {
          const Setting = mongoose.model('Setting');
          let settings = await Setting.findOne();
          
          if (!settings) {
            console.log('No settings found, using default settings');
            useDefaultSettings(res);
          } else {
            res.locals.settings = settings;
          }
        } catch (modelError) {
          console.error('Error accessing Setting model:', modelError);
          useDefaultSettings(res);
        }
        
        next();
      } catch (err) {
        console.error('Error loading settings:', err);
        useDefaultSettings(res);
        next();
      }
    });

    const publicRoutes = require('./routes/public');
    const adminRoutes = require('./routes/admin');

    // Routes
    app.use('/', publicRoutes);
    app.use('/admin', adminRoutes);
    
    // Add a 404 handler for any unmatched routes
    app.use((req, res) => {
      console.log(`404 Not Found: ${req.originalUrl}`);
      res.status(404).send(`
        <html>
          <head>
            <title>Page Not Found</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #333; }
              a { color: #3498db; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <h1>404 - Page Not Found</h1>
            <p>The page you are looking for does not exist.</p>
            <a href="/">Return to Homepage</a>
          </body>
        </html>
      `);
    });
    
    // Add error handler
    app.use((err, req, res, next) => {
      // Log the error for debugging
      console.error('Application error:', err);
      
      // Don't expose error details in production
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? err.message || 'Internal Server Error'
        : 'Something went wrong';
      
      // Send a simple HTML response
      res.status(500).send(`
        <html>
          <head>
            <title>Error</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #e74c3c; }
              a { color: #3498db; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <h1>Oops! Something went wrong</h1>
            <p>${errorMessage}</p>
            <a href="/">Return to Homepage</a>
          </body>
        </html>
      `);
    });
  } catch (error) {
    console.error('Error in setupRoutes:', error);
    // Continue with basic functionality
    const publicRoutes = require('./routes/public');
    app.use('/', publicRoutes);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the Express app for serverless environments
module.exports = app;
