// Load environment variables first, before any other imports
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const Setting = require('./models/Setting');
const connectToDatabase = require('./utils/database');

// Initialize app
const app = express();

// Connect to MongoDB at startup with better error handling
connectToDatabase()
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Check that your .env file exists and contains MONGODB_URI');
    
    // Continue app startup even if DB connection fails
    console.log('Starting app without database connection...');
  });

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

// Load models
require('./models/User');
require('./models/Gallery');
require('./models/Product');
require('./models/Testimonial');
require('./models/Contact');

const User = mongoose.model('User');
const Gallery = mongoose.model('Gallery');
const Product = mongoose.model('Product');
const Testimonial = mongoose.model('Testimonial');
const Contact = mongoose.model('Contact');

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

// Make settings available globally - with better error handling
app.use(async (req, res, next) => {
  try {
    // Get settings or create default if not exists
    const Setting = require('./models/Setting');
    
    // Set a timeout for the database operation
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timed out')), 5000)
    );
    
    // Race the database operation against the timeout
    let settings = await Promise.race([
      Setting.findOne().exec(),
      timeoutPromise
    ]);
    
    if (!settings) {
      console.log('No settings found, using defaults');
      settings = {
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
    
    // Make settings available to all templates
    res.locals.settings = settings;
    next();
  } catch (err) {
    console.error('Error loading settings:', err);
    // Continue even if settings fail to load
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
    next();
  }
});

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

// Routes
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
