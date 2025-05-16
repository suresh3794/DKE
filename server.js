// Load environment variables first, before any other imports
require('dotenv').config();

const VERBOSE_LOGGING = process.env.VERBOSE_LOGGING === 'true' || false;

// Create a custom logger function
const appLogger = {
  log: (...args) => {
    if (VERBOSE_LOGGING) {
      console.log(...args);
    }
  },
  // Always log errors and warnings
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args)
};

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const { connectToDatabase, isConnected } = require('./utils/database');

// Set strictQuery to suppress deprecation warning
mongoose.set('strictQuery', true);

// Initialize app
const app = express();

// Now we can safely use app
app.locals.appLogger = appLogger;

try {
  // Test Cloudinary configuration
  const { cloudinary } = require('./config/cloudinary');
  appLogger.log("Cloudinary configuration verified successfully");
} catch (error) {
  appLogger.error("Cloudinary configuration error:", error.message);
  appLogger.log("Check your Cloudinary environment variables");
}

// CRITICAL API ENDPOINTS - Define these BEFORE anything else
// These endpoints must be defined before any middleware or route handlers

// API Test endpoint
app.get('/api-test', (req, res) => {
  appLogger.log('API test endpoint called');
  res.json({ message: 'API is working!' });
});

// Dashboard stats endpoint
app.get('/dashboard-stats', async (req, res) => {
  try {
    appLogger.log('Dashboard stats endpoint called');
    
    // Set content type explicitly to application/json
    res.setHeader('Content-Type', 'application/json');
    
    // Check if database is connected
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      appLogger.log('Database not connected, returning zero counts');
      return res.json({
        productCount: 0,
        galleryCount: 0,
        testimonialCount: 0,
        newMessageCount: 0
      });
    }
    
    // Get models
    const Product = mongoose.model('Product');
    const Gallery = mongoose.model('Gallery');
    const Testimonial = mongoose.model('Testimonial');
    const Contact = mongoose.model('Contact');
    
    // Get counts from database
    const [productCount, galleryCount, testimonialCount, newMessageCount] = await Promise.all([
      Product.countDocuments(),
      Gallery.countDocuments(),
      Testimonial.countDocuments(),
      Contact.countDocuments({ status: 'new' })
    ]);
    
    appLogger.log('Dashboard counts:', {
      productCount,
      galleryCount,
      testimonialCount,
      newMessageCount
    });
    
    // Return the actual counts
    return res.json({
      productCount,
      galleryCount,
      testimonialCount,
      newMessageCount
    });
  } catch (err) {
    appLogger.error('Error in dashboard stats endpoint:', err);
    return res.status(500).json({ 
      error: 'Error loading dashboard data',
      productCount: 0,
      galleryCount: 0,
      testimonialCount: 0,
      newMessageCount: 0
    });
  }
});

// Load all models regardless of connection status
// This ensures schemas are registered even if DB connection fails
require('./models/User');
require('./models/Gallery');
require('./models/Product');
require('./models/Testimonial');
require('./models/Contact');
require('./models/Setting');

// Add this near your other routes
app.get('/', (req, res) => {
  // Redirect root URL to login page
  res.redirect('/index.html');
});

// Function to set up routes and middleware
function setupRoutes() {
  // NOW add the regular middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Add middleware to make appLogger available in req
  app.use((req, res, next) => {
    req.appLogger = appLogger;
    next();
  });
  
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
      appLogger.log('API testimonials endpoint called');
      
      // Set the content type explicitly
      res.setHeader('Content-Type', 'application/json');
      
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        appLogger.log('Database not connected, returning empty testimonials array');
        return res.json({ testimonials: [] });
      }
      
      const Testimonial = mongoose.model('Testimonial');
      const testimonials = await Testimonial.find().sort({ createdAt: -1 });
      appLogger.log(`Found ${testimonials.length} testimonials`);
      
      // Return the testimonials as JSON
      return res.json({ testimonials: testimonials });
    } catch (err) {
      appLogger.error('Error fetching testimonials:', err);
      // Make sure we return JSON even in case of error
      return res.status(500).json({ error: 'Failed to fetch testimonials', message: err.message });
    }
  });

  // Get featured testimonials
  app.get('/api/testimonials/featured', async (req, res) => {
    try {
      appLogger.log('API featured testimonials endpoint called');
      
      // Set the content type explicitly
      res.setHeader('Content-Type', 'application/json');
      
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        appLogger.log('Database not connected, returning empty testimonials array');
        return res.json({ testimonials: [] });
      }
      
      const Testimonial = mongoose.model('Testimonial');
      const testimonials = await Testimonial.find({ featured: true }).limit(3);
      appLogger.log(`Found ${testimonials.length} featured testimonials`);
      
      // Return the testimonials as JSON
      return res.json({ testimonials: testimonials });
    } catch (err) {
      appLogger.error('Error fetching featured testimonials:', err);
      // Make sure we return JSON even in case of error
      return res.status(500).json({ error: 'Failed to fetch featured testimonials', message: err.message });
    }
  });

  // Get site settings - accessible to both public and admin
  app.get('/api/admin/settings', async (req, res) => {
    try {
      appLogger.log('API admin settings endpoint called');
      
      // Set the content type explicitly
      res.setHeader('Content-Type', 'application/json');
      
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        appLogger.log('Database not connected, returning default settings');
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
      
      appLogger.log('Returning settings:', settings);
      
      // Return the settings as JSON
      return res.json({ settings });
    } catch (err) {
      appLogger.error('Error fetching admin settings:', err);
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
      appLogger.log('Public API settings endpoint called');
      
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        appLogger.log('Database not connected, returning default settings');
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
      appLogger.log('Returning public settings:', settings);
      res.json(settings);
    } catch (err) {
      appLogger.error('Error fetching settings:', err);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // Get all products
  app.get('/api/products', async (req, res) => {
    try {
      appLogger.log('API products endpoint called');
      
      // Set the content type explicitly
      res.setHeader('Content-Type', 'application/json');
      
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        appLogger.log('Database not connected, returning empty products array');
        return res.json({ products: [] });
      }
      
      const Product = mongoose.model('Product');
      const products = await Product.find().sort({ category: 1 });
      appLogger.log(`Found ${products.length} products`);
      
      // Return the products as JSON
      return res.json({ products: products });
    } catch (err) {
      appLogger.error('Error fetching products:', err);
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
      appLogger.error('Error fetching featured products:', err);
      res.status(500).json({ error: 'Failed to fetch featured products' });
    }
  });

  // Direct API endpoint for products list
  app.get('/api/products-list', async (req, res) => {
    try {
      appLogger.log('Direct API endpoint for products list called');
      res.setHeader('Content-Type', 'application/json');
      
      const Product = mongoose.model('Product');
      const products = await Product.find().sort({ createdAt: -1 });
      appLogger.log(`Found ${products.length} products`);
      res.json({ products });
    } catch (err) {
      appLogger.error('Error in direct /api/products-list:', err);
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
  
  // Add a direct route handler for contact form as a fallback
  app.post('/contact', async (req, res) => {
    try {
      const { name, email, phone, subject, message, product } = req.body;
      
      // Validate required fields
      if (!name || !email || !subject || !message) {
        return res.redirect('/contact?error=Please fill in all required fields');
      }
      
      // Make sure the Contact model is properly loaded
      const Contact = mongoose.model('Contact');
      
      const newContact = new Contact({
        name,
        email,
        phone: phone || '',
        subject,
        message,
        product: product || '',
        status: 'new'
      });
      
      
      await newContact.save();
      
      // Redirect to success page
      res.redirect('/contact/success');
    } catch (err) {
      appLogger.error('Contact form error:', err);
      res.redirect('/contact?error=Failed to send your message. Please try again.');
    }
  });

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
      appLogger.error('Error fetching gallery items:', err);
      res.status(500).json({ error: 'Failed to fetch gallery items' });
    }
  });

  // Direct API endpoint for gallery items
  app.get('/api/gallery-items', async (req, res) => {
    try {
      appLogger.log('Direct API endpoint for gallery items called');
      const Gallery = mongoose.model('Gallery');
      const galleryItems = await Gallery.find().sort({ createdAt: -1 });
      appLogger.log(`Found ${galleryItems.length} gallery items`);
      res.json({ galleryItems });
    } catch (err) {
      appLogger.error('Error in direct /api/gallery-items:', err);
      res.status(500).json({ error: 'Failed to load gallery items' });
    }
  });

  // Direct dashboard API endpoint - placed before any other routes
  app.get('/dashboard-stats', (req, res) => {
    try {
      appLogger.log('Dashboard stats endpoint called');
      // Set content type explicitly to application/json
      res.setHeader('Content-Type', 'application/json');
      
      // For testing purposes, return hardcoded data
      // This will work even if the database connection fails
      return res.status(200).send(JSON.stringify({
        productCount: 5,
        galleryCount: 10,
        testimonialCount: 3,
        newMessageCount: 2
      }));
      
      /* Uncomment this when database is working
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        appLogger.log('Database not connected, returning zero counts');
        return res.status(200).send(JSON.stringify({
          productCount: 0,
          galleryCount: 0,
          testimonialCount: 0,
          newMessageCount: 0
        }));
      }
      
      const Product = mongoose.model('Product');
      const Gallery = mongoose.model('Gallery');
      const Testimonial = mongoose.model('Testimonial');
      const Contact = mongoose.model('Contact');
      
      const productCount = await Product.countDocuments();
      const galleryCount = await Gallery.countDocuments();
      const testimonialCount = await Testimonial.countDocuments();
      const newMessageCount = await Contact.countDocuments({ status: 'new' });
      
      appLogger.log('Dashboard counts:', {
        productCount,
        galleryCount,
        testimonialCount,
        newMessageCount
      });
      
      return res.status(200).send(JSON.stringify({
        productCount,
        galleryCount,
        testimonialCount,
        newMessageCount
      }));
      */
    } catch (err) {
      appLogger.error('Error in dashboard stats endpoint:', err);
      return res.status(500).send(JSON.stringify({ 
        error: 'Error loading dashboard data',
        productCount: 0,
        galleryCount: 0,
        testimonialCount: 0,
        newMessageCount: 0
      }));
    }
  });

  // Test endpoint to verify API is working
  app.get('/api-test', (req, res) => {
    // Set content type explicitly to application/json
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ message: 'API is working!' }));
  });

  // Recent activity endpoint
  app.get('/api/recent-activity', async (req, res) => {
    try {
      // Set content type explicitly to application/json
      res.setHeader('Content-Type', 'application/json');
      
      // Check if database is connected
      if (!isConnected() || mongoose.connection.readyState !== 1) {
        appLogger.warn('Database not connected, returning empty activity list');
        return res.json({ activities: [] });
      }
      
      // Get models
      const Product = mongoose.model('Product');
      const Gallery = mongoose.model('Gallery');
      const Contact = mongoose.model('Contact');
      
      // Get recent items from each collection
      let recentProducts = [];
      let recentGallery = [];
      let recentContacts = [];
      
      try {
        recentProducts = await Product.find().sort({ updatedAt: -1 }).limit(5);
      } catch (err) {
        appLogger.error('Error fetching products:', err);
      }
      
      try {
        recentGallery = await Gallery.find().sort({ createdAt: -1 }).limit(5);
      } catch (err) {
        appLogger.error('Error fetching gallery items:', err);
      }
      
      try {
        recentContacts = await Contact.find().sort({ createdAt: -1 }).limit(5);
      } catch (err) {
        appLogger.error('Error fetching contacts:', err);
      }
      
      // Format activities
      const activities = [];
      
      // Add product activities
      recentProducts.forEach(product => {
        try {
          const createdAt = product.createdAt ? new Date(product.createdAt) : new Date();
          const updatedAt = product.updatedAt ? new Date(product.updatedAt) : new Date();
          
          activities.push({
            type: 'product',
            action: createdAt.getTime() === updatedAt.getTime() ? 'added' : 'updated',
            item: product.name || 'Product',
            time: updatedAt
          });
        } catch (err) {
          appLogger.error('Error processing product:', err);
        }
      });
      
      // Add gallery activities
      recentGallery.forEach(gallery => {
        try {
          activities.push({
            type: 'gallery',
            action: 'uploaded',
            item: gallery.title || 'Gallery Image',
            time: gallery.createdAt || new Date()
          });
        } catch (err) {
          appLogger.error('Error processing gallery item:', err);
        }
      });
      
      // Add contact activities
      recentContacts.forEach(contact => {
        try {
          activities.push({
            type: 'contact',
            action: 'submitted',
            item: contact.name || 'Contact',
            time: contact.createdAt || new Date()
          });
        } catch (err) {
          appLogger.error('Error processing contact:', err);
        }
      });
      
      // Sort by time (newest first)
      activities.sort((a, b) => {
        const timeA = a.time instanceof Date ? a.time : new Date(a.time);
        const timeB = b.time instanceof Date ? b.time : new Date(b.time);
        return timeB - timeA;
      });
      
      // Limit to 10 most recent activities
      const recentActivities = activities.slice(0, 10);
      
      // Convert dates to ISO strings for JSON serialization
      const serializedActivities = recentActivities.map(activity => ({
        ...activity,
        time: activity.time instanceof Date ? activity.time.toISOString() : activity.time
      }));
      
      // Return the activities
      return res.json({ activities: serializedActivities });
    } catch (err) {
      appLogger.error('Error in recent activity endpoint:', err);
      return res.status(500).json({ 
        error: 'Error loading recent activity',
        activities: []
      });
    }
  });

  // Add a 404 handler for any unmatched routes
  app.use((req, res) => {
    appLogger.log(`404 Not Found: ${req.originalUrl}`);
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
    appLogger.error('Application error:', err);
    
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
    appLogger.log('Database not connected, attempting to reconnect...');
    connectToDatabase().catch(err => {
      appLogger.error('Failed to reconnect to database:', err);
    });
  }
  next();
});

// MongoDB connection with better error handling
connectToDatabase()
  .then((connection) => {
    if (connection) {
      appLogger.log('MongoDB connected successfully');
      setupRoutes();
    } else {
      appLogger.log('Failed to connect to MongoDB, app will run with limited functionality');
      setupRoutes();
    }
  })
  .catch(err => {
    appLogger.error('MongoDB connection error:', err);
    appLogger.log('Check that your .env file exists and contains MONGODB_URI');
    appLogger.log('Starting app without database connection...');
    setupRoutes();
  });

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  appLogger.log(`Server running on port ${PORT}`);
});

// Export the Express app for serverless environments
module.exports = app;
