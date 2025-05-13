// Load environment variables first, before any other imports
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const connectToDatabase = require('./utils/database');

// Initialize app
const app = express();

// Connect to MongoDB at startup with better error handling
connectToDatabase()
  .then(() => {
    console.log('MongoDB connected successfully');
    
    // Only load models after successful connection
    require('./models/User');
    require('./models/Gallery');
    require('./models/Product');
    require('./models/Testimonial');
    require('./models/Contact');
    require('./models/Setting');
    
    // IMPORTANT: Only access models after they've been registered
    setupRoutes();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Check that your .env file exists and contains MONGODB_URI');
    
    // Continue app startup even if DB connection fails
    console.log('Starting app without database connection...');
    setupRoutes();
  });

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Set view engine with absolute path
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Add debug logging
console.log('Current directory:', __dirname);
console.log('Views directory:', path.join(__dirname, 'views'));
console.log('Files in views directory:', require('fs').readdirSync(path.join(__dirname, 'views')));

// Function to set up routes and models after DB connection
function setupRoutes() {
  try {
    // Only try to access models if database is connected
    if (mongoose.connection.readyState === 1) {
      console.log('Loading models from successful DB connection');
      // Now it's safe to access models
      const User = mongoose.model('User');
      const Gallery = mongoose.model('Gallery');
      const Product = mongoose.model('Product');
      const Testimonial = mongoose.model('Testimonial');
      const Contact = mongoose.model('Contact');
      const Setting = mongoose.model('Setting');
    } else {
      console.log('Database not connected, using mock models');
      // Create mock models or handle the case when models aren't available
    }
    
    // Make settings available globally - with better error handling
    app.use(async (req, res, next) => {
      try {
        // Make sure database is connected before querying
        if (mongoose.connection.readyState !== 1) {
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
  } catch (error) {
    console.error('Error in setupRoutes:', error);
    // Continue with basic functionality
    const publicRoutes = require('./routes/public');
    app.use('/', publicRoutes);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
