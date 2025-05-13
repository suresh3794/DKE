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
  // Now it's safe to access models
  const User = mongoose.model('User');
  const Gallery = mongoose.model('Gallery');
  const Product = mongoose.model('Product');
  const Testimonial = mongoose.model('Testimonial');
  const Contact = mongoose.model('Contact');
  const Setting = mongoose.model('Setting');
  
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
      const Setting = mongoose.model('Setting');
      let settings = await Setting.findOne();
      
      if (!settings) {
        console.log('No settings found, creating default settings');
        settings = new Setting();
        await settings.save();
      }
      
      // Log settings for debugging
      console.log('Loaded settings:', {
        siteName: settings.siteName,
        heroSlides: settings.heroSlides ? settings.heroSlides.map(s => s ? 'exists' : 'empty') : 'undefined'
      });
      
      // Make settings available to all templates
      res.locals.settings = settings;
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

  const publicRoutes = require('./routes/public');
  const adminRoutes = require('./routes/admin');

  // Routes
  app.use('/', publicRoutes);
  app.use('/admin', adminRoutes);
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
