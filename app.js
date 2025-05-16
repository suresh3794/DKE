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

// Function to set up routes and middleware
function setupRoutes() {
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  }));

  // Set up view engine for any routes that still use render
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');

  // API Routes - Define these BEFORE static files and other routes
  
  // Get all testimonials
  app.get('/api/testimonials', async (req, res) => {
    try {
      console.log('API testimonials endpoint called');
      
      // Set the content type explicitly
      res.setHeader('Content-Type', 'application/json');
      
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        console.log('Database not connected, returning empty testimonials array');
        return res.json({ testimonials: [] });
      }
      
      const Testimonial = mongoose.model('Testimonial');
      const testimonials = await Testimonial.find().sort({ createdAt: -1 });
      console.log(`Found ${testimonials.length} testimonials`);
      
      // Return the testimonials as JSON
      return res.json({ testimonials: testimonials });
    } catch (err) {
      console.error('Error fetching testimonials:', err);
      // Make sure we return JSON even in case of error
      return res.status(500).json({ error: 'Failed to fetch testimonials', message: err.message });
    }
  });

  // Get featured testimonials
  app.get('/api/testimonials/featured', async (req, res) => {
    try {
      console.log('API featured testimonials endpoint called');
      
      // Set the content type explicitly
      res.setHeader('Content-Type', 'application/json');
      
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        console.log('Database not connected, returning empty testimonials array');
        return res.json({ testimonials: [] });
      }
      
      const Testimonial = mongoose.model('Testimonial');
      const testimonials = await Testimonial.find({ featured: true }).limit(3);
      console.log(`Found ${testimonials.length} featured testimonials`);
      
      // Return the testimonials as JSON
      return res.json({ testimonials: testimonials });
    } catch (err) {
      console.error('Error fetching featured testimonials:', err);
      // Make sure we return JSON even in case of error
      return res.status(500).json({ error: 'Failed to fetch featured testimonials', message: err.message });
    }
  });

  // Get site settings - accessible to both public and admin
  app.get('/api/admin/settings', async (req, res) => {
    try {
      console.log('API admin settings endpoint called');
      
      // Set the content type explicitly
      res.setHeader('Content-Type', 'application/json');
      
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        console.log('Database not connected, returning default settings');
        return res.json({ 
          settings: {
            siteName: 'Dignity Kitchen',
            siteTagline: 'Kitchen Equipment Supplier',
            contactEmail: 'info@example.com',
            contactPhone: '+1234567890',
            contactAddress: 'Default Address',
            heroSlides: Array(6).fill('')
          } 
        });
      }
      
      const Setting = mongoose.model('Setting');
      let settings = await Setting.findOne();
      
      if (!settings) {
        settings = new Setting();
        await settings.save();
      }
      
      console.log('Returning settings:', settings);
      
      // Return the settings as JSON
      return res.json({ settings });
    } catch (err) {
      console.error('Error fetching admin settings:', err);
      // Make sure we return JSON even in case of error
      return res.status(500).json({ 
        error: 'Failed to fetch settings', 
        message: err.message,
        settings: {
          siteName: 'Dignity Kitchen',
          siteTagline: 'Kitchen Equipment Supplier',
          contactEmail: 'info@example.com',
          contactPhone: '+1234567890',
          contactAddress: 'Default Address',
          heroSlides: Array(6).fill('')
        }
      });
    }
  });

  // Get site settings
  app.get('/api/settings', async (req, res) => {
    try {
      console.log('Public API settings endpoint called');
      
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        console.log('Database not connected, returning default settings');
        return res.json({
          siteName: 'Dignity Kitchen',
          siteTagline: 'Kitchen Equipment Supplier',
          contactEmail: 'info@example.com',
          contactPhone: '+1234567890',
          contactAddress: 'Default Address',
          footerText: 'Copyright © 2023 Dignity Kitchen. All rights reserved.',
          socialFacebook: 'https://facebook.com/',
          socialInstagram: 'https://instagram.com/',
          socialTwitter: 'https://twitter.com/'
        });
      }
      
      const Setting = mongoose.model('Setting');
      const settings = await Setting.findOne() || {};
      console.log('Returning public settings:', settings);
      res.json(settings);
    } catch (err) {
      console.error('Error fetching settings:', err);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // Get all products
  app.get('/api/products', async (req, res) => {
    try {
      console.log('API products endpoint called');
      
      // Set the content type explicitly
      res.setHeader('Content-Type', 'application/json');
      
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        console.log('Database not connected, returning empty products array');
        return res.json({ products: [] });
      }
      
      const Product = mongoose.model('Product');
      const products = await Product.find().sort({ category: 1 });
      console.log(`Found ${products.length} products`);
      
      // Return the products as JSON
      return res.json({ products: products });
    } catch (err) {
      console.error('Error fetching products:', err);
      // Make sure we return JSON even in case of error
      return res.status(500).json({ error: 'Failed to fetch products', message: err.message });
    }
  });

  // Get featured products
  app.get('/api/products/featured', async (req, res) => {
    try {
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        return res.json([]);
      }
      
      const Product = mongoose.model('Product');
      const featuredProducts = await Product.find({ featured: true }).limit(6);
      res.json(featuredProducts);
    } catch (err) {
      console.error('Error fetching featured products:', err);
      res.status(500).json({ error: 'Failed to fetch featured products' });
    }
  });

  // Direct API endpoint for products list
  app.get('/api/products-list', async (req, res) => {
    try {
      console.log('Direct API endpoint for products list called');
      res.setHeader('Content-Type', 'application/json');
      
      const Product = mongoose.model('Product');
      const products = await Product.find().sort({ createdAt: -1 });
      console.log(`Found ${products.length} products`);
      res.json({ products });
    } catch (err) {
      console.error('Error in direct /api/products-list:', err);
      res.status(500).json({ error: 'Failed to load products' });
    }
  });

  // Static file middleware - AFTER API routes
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/components', express.static(path.join(__dirname, 'public/components')));

  // Import route files
  const adminRoutes = require('./routes/admin');
  const publicRoutes = require('./routes/index');

  // Register routes - IMPORTANT: Order matters!
  app.use('/admin', adminRoutes);
  app.use('/', publicRoutes);

  // Get all gallery items
  app.get('/api/gallery', async (req, res) => {
    try {
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        return res.json([]);
      }
      
      const Gallery = mongoose.model('Gallery');
      const galleryItems = await Gallery.find().sort({ createdAt: -1 });
      res.json(galleryItems);
    } catch (err) {
      console.error('Error fetching gallery items:', err);
      res.status(500).json({ error: 'Failed to fetch gallery items' });
    }
  });

  // Direct API endpoint for gallery items
  app.get('/api/gallery-items', async (req, res) => {
    try {
      console.log('Direct API endpoint for gallery items called');
      const Gallery = mongoose.model('Gallery');
      const galleryItems = await Gallery.find().sort({ createdAt: -1 });
      console.log(`Found ${galleryItems.length} gallery items`);
      res.json({ galleryItems });
    } catch (err) {
      console.error('Error in direct /api/gallery-items:', err);
      res.status(500).json({ error: 'Failed to load gallery items' });
    }
  });

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
}

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

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the Express app for serverless environments
module.exports = app;
