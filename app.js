// Load environment variables first, before any other imports
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const connectToDatabase = require('./utils/database');

// Initialize app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Set view engine with absolute path
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Add debug logging
console.log('Current directory:', __dirname);
console.log('Views directory:', path.join(__dirname, 'views'));
try {
  console.log('Files in views directory:', require('fs').readdirSync(path.join(__dirname, 'views')));
} catch (err) {
  console.error('Error reading views directory:', err);
}

// Connect to MongoDB at startup with better error handling
connectToDatabase()
  .then(() => {
    console.log('MongoDB connected successfully');
    
    // Only load models after successful connection
    // Import models directly to ensure they're registered
    const User = require('./models/User');
    const Gallery = require('./models/Gallery');
    const Product = require('./models/Product');
    const Testimonial = require('./models/Testimonial');
    const Contact = require('./models/Contact');
    const Setting = require('./models/Setting');
    
    // IMPORTANT: Only access models after they've been registered
    setupRoutes(User, Gallery, Product, Testimonial, Contact, Setting);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Check that your .env file exists and contains MONGODB_URI');
    
    // Continue app startup even if DB connection fails
    console.log('Starting app without database connection...');
    setupRoutes();
  });

// Function to set up routes and models after DB connection
function setupRoutes(User, Gallery, Product, Testimonial, Contact, Setting) {
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
      let settings;
      try {
        // Use the passed Setting model if available
        if (Setting) {
          settings = await Setting.findOne();
        } else {
          // Fallback to mongoose.model if Setting wasn't passed
          const SettingModel = mongoose.model('Setting');
          settings = await SettingModel.findOne();
        }
      } catch (modelError) {
        console.error('Error getting Setting model:', modelError);
        useDefaultSettings(res);
        return next();
      }
      
      if (!settings) {
        console.log('No settings found, using defaults');
        useDefaultSettings(res);
      } else {
        // Make settings available to all templates
        res.locals.settings = settings;
      }
      next();
    } catch (err) {
      console.error('Error loading settings:', err);
      useDefaultSettings(res);
      next();
    }
  });

  // Helper function for default settings
  function useDefaultSettings(res) {
    res.locals.settings = {
      siteName: 'Dignity Kitchen',
      siteTagline: 'Quality Kitchen Products',
      contactEmail: 'contact@dignitykitchen.com',
      contactPhone: '+1 (555) 123-4567',
      contactAddress: '123 Main Street, City, Country',
      socialFacebook: 'https://facebook.com/',
      socialInstagram: 'https://instagram.com/',
      socialTwitter: 'https://twitter.com/',
      aboutText: 'Welcome to Dignity Kitchen, where we provide high-quality kitchen products.',
      footerText: '© Dignity Kitchen. All rights reserved.'
    };
  }

  // Add a simple health check route
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', dbConnected: mongoose.connection.readyState === 1 });
  });

  // Add a fallback route for the root path
  app.get('/', (req, res) => {
    res.render('index');
  });

  try {
    const publicRoutes = require('./routes/public');
    app.use('/', publicRoutes);
  } catch (err) {
    console.error('Error loading public routes:', err);
    // Add a fallback route if public routes fail to load
    app.get('/', (req, res) => {
      res.render('index');
    });
  }

  try {
    const adminRoutes = require('./routes/admin');
    app.use('/admin', adminRoutes);
  } catch (err) {
    console.error('Error loading admin routes:', err);
  }

  // Add a 404 handler
  app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' });
  });
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the Express API for Vercel
module.exports = app;
