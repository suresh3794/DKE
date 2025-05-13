const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const Setting = require('./models/Setting');

// Initialize app
const app = express();

// Connect to MongoDB (using MongoDB Atlas)
mongoose.connect('mongodb+srv://3994suresh:7KbAHTdZmJyhEZ3J@cluster0.5qooyr4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
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

// Set view engine
app.set('view engine', 'ejs');

// Make sure this middleware is placed BEFORE your route definitions
// Make settings available globally
app.use(async (req, res, next) => {
  try {
    // Get settings or create default if not exists
    const Setting = require('./models/Setting');
    let settings = await Setting.findOne();
    
    if (!settings) {
      settings = new Setting();
      await settings.save();
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
