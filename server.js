// Load environment variables from .env and .env.local (if it exists)
require('dotenv').config();
try {
  require('dotenv').config({ path: '.env.local', override: true });
  console.log("Loaded environment variables from .env.local");
} catch (error) {
  console.log("No .env.local file found, using .env variables");
}

// Log the MongoDB URI (masked for security)//
console.log("MongoDB URI (masked):", 
  process.env.MONGODB_URI ? 
  process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//****:****@") : 
  "Not defined");

const bcrypt = require('bcrypt');  
const fs = require('fs');
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const app = express();
const router = express.Router();
const port = process.env.PORT || 3000;
const MongoStore = require('connect-mongo');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Add this near the top of your file with other imports
const { 
  cloudinary,
  galleryUpload, 
  productUpload, 
  testimonialUpload, 
  heroSlideUpload,
  deleteImage 
} = require('./config/cloudinary');

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.warn("⚠️ MONGODB_URI environment variable is not set. Using default connection string.");
  process.env.MONGODB_URI = "mongodb://localhost:27017/wipdatabase";
}

// Log the MongoDB URI (masked for security)
console.log("MongoDB URI (masked):", 
  process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//****:****@"));

// Middleware
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      mongoOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        retryWrites: true,
        w: 'majority'
      },
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60, // = 14 days
      autoRemove: 'native'
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
  })
);
app.use(cors());

// Ensure these middleware are set up
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add this near the top of your file with other middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add this near the top of your file
console.log("MongoDB URI (masked):", process.env.MONGODB_URI ? 
  process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//****:****@") : 
  "Not defined");

let isDbConnected = false;

// MongoDB connection with better error handling and retry logic
async function connectToMongoDB() {
  try {
    console.log("🔄 Attempting to connect to MongoDB...");
    
    // Connect with proper options for replica sets
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // These options help with replica set connections
      retryWrites: true,
      w: 'majority'
    });
    
    console.log("✅ Connected to MongoDB successfully");
    isDbConnected = true;
    
    // Remove the call to watchProjectStatusChanges
    // setTimeout(watchProjectStatusChanges, 3000);
    
    // Set up connection event handlers
    mongoose.connection.on('disconnected', () => {
      console.log('❌ MongoDB disconnected');
      isDbConnected = false;
      // Try to reconnect
      setTimeout(connectToMongoDB, 5000);
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isDbConnected = false;
    });
    
    return true;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    isDbConnected = false;
    
    // Retry connection after 5 seconds
    console.log("🔄 Retrying connection in 5 seconds...");
    setTimeout(connectToMongoDB, 5000);
    
    return false;
  }
}

// Call the connection function
connectToMongoDB();

// Update Cloudinary configuration
try {
  // Log the Cloudinary configuration (with masked secrets)
  console.log("Cloudinary configuration:", {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
    api_key: process.env.CLOUDINARY_API_KEY ? '****' : 'not set',
    api_secret: process.env.CLOUDINARY_API_SECRET ? '****' : 'not set'
  });
  
  // Configure Cloudinary with your credentials
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
  // Verify configuration
  const cloudConfig = cloudinary.config();
  if (!cloudConfig.cloud_name || !cloudConfig.api_key || !cloudConfig.api_secret) {
    throw new Error("Missing Cloudinary credentials");
  }
  
  console.log("✅ Cloudinary configured successfully");
} catch (error) {
  console.error("❌ Error configuring Cloudinary:", error);
}

// Set up Cloudinary storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 200, height: 200, crop: 'limit' }]
  }
});

// Set up Cloudinary storage for project files
const projectFileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'project-files',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
    resource_type: 'auto'
  }
});

// Update multer configurations
const avatarUpload = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const projectFileUpload = multer({ 
  storage: projectFileStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
// Add this middleware to check DB connection before processing API requests
app.use('/api', async (req, res, next) => {
  console.log(`API Request: ${req.method} ${req.url}`);
  
  // Check if database is connected
  if (!isDbConnected) {
    console.log("⚠️ Database not connected, checking connection state...");
    
    // Check connection state
    if (mongoose.connection.readyState !== 1) {
      console.log("⚠️ Attempting to reconnect to database...");
      
      try {
        // Try to reconnect
        const connected = await connectToMongoDB();
        if (!connected) {
          return res.status(503).json({ 
            message: "Database connection unavailable, please try again later",
            readyState: mongoose.connection.readyState
          });
        }
      } catch (error) {
        console.error("❌ Failed to reconnect to database:", error);
        return res.status(503).json({ 
          message: "Database connection unavailable, please try again later" 
        });
      }
    } else {
      isDbConnected = true;
      console.log("✅ Database connection is actually active");
    }
  }
  
  next();
});

// Add this function to get Cloudinary URLs for static assets
function getCloudinaryUrl(assetName) {
  // Check if Cloudinary is configured
  const config = cloudinary.config();
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    // Return local path if Cloudinary is not configured
    return assetName;
  }
  
  // Map of asset names to their specific public IDs
  const assetPublicIds = {
    'success.png': 'success_tayqq4',
    'addproject.png': 'addproject_gs1mly' // Add the public ID after uploading
  };
  
  // Use the specific public ID if available, otherwise use the asset name
  const publicId = assetPublicIds[assetName] || assetName;
  
  // Return the Cloudinary URL for the asset
  return cloudinary.url(publicId, {
    secure: true
  });
}

// Add this endpoint to serve static assets from Cloudinary
app.get('/api/asset-url/:assetName', (req, res) => {
  try {
    const { assetName } = req.params;
    const url = getCloudinaryUrl(assetName);
    console.log(`Generated Cloudinary URL for ${assetName}: ${url}`);
    res.json({ url });
  } catch (error) {
    console.error(`Error generating asset URL for ${req.params.assetName}:`, error);
    res.status(500).json({ 
      url: req.params.assetName,
      error: error.message
    });
  }
});

// Remove all schema and model definitions from server.js
// And add this import at the top of your file
const User = require('./models/User');
const Gallery = require('./models/Gallery');
const Product = require('./models/Product');
const Setting = require('./models/Setting');
const Testimonial = require('./models/Testimonial');
const Contact = require('./models/Contact');



// Authentication middleware
function isAuthenticated(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1]; // Extract token
  console.log("Token received:", token); // Debugging

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ message: "Unauthorized access" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err, user) => {
    if (err) {
      console.log("Token verification failed:", err);
      return res.status(403).json({ message: "Forbidden access" });
    }
    console.log("Authenticated user:", user); // Debugging
    req.user = user;
    next();
  });
}

// Add this near your other routes
app.get('/', (req, res) => {
  // Redirect root URL to index.html in the public directory
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Serve login.html publicly
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// Serve static files from the root directory and subdirectories
app.use(express.static(path.join(__dirname, 'public')));
app.use('/styles', express.static(path.join(__dirname, 'public/styles')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/components', express.static(path.join(__dirname, 'public/components')));

// Add these routes to handle the header links
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/contact.html'));
});

app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/gallery.html'));
});

app.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/products.html'));
});

// Make sure this is also included for the login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

// Routes
app.post("/api/register", async (req, res) => {
  const { 
    empId,
    username, 
    email, 
    password, 
    dob, 
    role,
    phone,
    location,
    department,
    position,
    joinDate,
    avatarUrl: defaultAvatarUrl // Use Cloudinary default avatar
  } = req.body;

  try {
    // Validate required fields
    if (!empId || !username || !email || !password || !dob || !role) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: username },
        { email: email },
        { empId: empId }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'Username, email, or Employee ID already exists' 
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with all fields
    const newUser = new User({
      empId,
      username,
      email,
      password: hashedPassword,
      dob: new Date(dob),
      role,
      phone: phone || undefined,
      location: location || undefined,
      department: department || undefined,
      position: position || undefined,
      joinDate: joinDate ? new Date(joinDate) : undefined
    });

    await newUser.save();

    // Remove audit log code
    // await createAuditLog(...);

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, username, password, role);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue with registration even if email fails
    }

    // Send success response without password
    const userResponse = newUser.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ 
      message: 'Error registering user',
      error: error.message 
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    console.log("Login attempt for username:", req.body.username);
    const { username, password } = req.body;
    
    // Check if username is provided
    if (!username) {
      console.log("Login failed: No username provided");
      return res.status(400).json({ message: "Username is required" });
    }
    
    // Find the user
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log("Login failed: User not found for username:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Login failed: Invalid password for username:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("Login successful for username:", username);
    
    // Update last active timestamp
    user.lastActive = new Date();
    await user.save();

    // Create token with user ID, username and role
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1h" }
    );

    // Keep the same response structure as before
    res.status(200).json({
      token,
      role: user.role,
      name: user.username,
      id: user._id,
      avatarUrl: user.avatarUrl || defaultAvatarUrl // Include avatar URL
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to log out");
    }
    res.sendStatus(200);
  });
});

// Add this route to serve your HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Add routes for other HTML files
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Add a catch-all route for other HTML files
app.get('/:page.html', (req, res) => {
  const page = req.params.page;
  res.sendFile(path.join(__dirname, `${page}.html`));
});

// API Routes (Protected)
//New routes for Dignity Kitchen

// Add this function to check database connection status
function isConnected() {
  return mongoose.connection.readyState === 1;
}

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

  app.get('/dashboard-stats', (req, res) => {
    try {
      console.log('Dashboard stats endpoint called');
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
    } catch (err) {
      console.error('Error in dashboard stats endpoint:', err);
      return res.status(500).send(JSON.stringify({ 
        error: 'Error loading dashboard data',
        productCount: 0,
        galleryCount: 0,
        testimonialCount: 0,
        newMessageCount: 0
      }));
    }
  });

  // Admin routes - Adding directly to server.js instead of using a separate router
// Add these before line 835



// Add debugging middleware
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Admin dashboard
app.get('/admin', (req, res) => {
  console.log('Admin route accessed, session:', req.session);
  
  if (req.session && req.session.isAdmin) {
    console.log('User is authenticated, redirecting to dashboard');
    return res.redirect('/admin/dashboard');
  } else {
    console.log('User is not authenticated, redirecting to login');
    return res.redirect('/admin/login');
  }
});

// API endpoint for dashboard data
app.get('/admin/api/dashboard', (req, res) => {
  try {
    console.log('Dashboard API endpoint called');
    
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.json({
        productCount: 0,
        galleryCount: 0,
        testimonialCount: 0,
        newMessageCount: 0
      });
    }
    
    const Product = mongoose.model('Product');
    const Gallery = mongoose.model('Gallery');
    const Testimonial = mongoose.model('Testimonial');
    const Contact = mongoose.model('Contact');
    
    Promise.all([
      Product.countDocuments(),
      Gallery.countDocuments(),
      Testimonial.countDocuments(),
      Contact.countDocuments({ status: 'new' })
    ])
    .then(([productCount, galleryCount, testimonialCount, newMessageCount]) => {
      console.log('Dashboard counts:', {
        productCount,
        galleryCount,
        testimonialCount,
        newMessageCount
      });
      
      res.json({
        productCount,
        galleryCount,
        testimonialCount,
        newMessageCount
      });
    })
    .catch(err => {
      console.error('Error in dashboard API:', err);
      res.status(500).json({ 
        error: 'Error loading dashboard data',
        productCount: 0,
        galleryCount: 0,
        testimonialCount: 0,
        newMessageCount: 0
      });
    });
  } catch (err) {
    console.error('Error in dashboard API:', err);
    res.status(500).json({ 
      error: 'Error loading dashboard data',
      productCount: 0,
      galleryCount: 0,
      testimonialCount: 0,
      newMessageCount: 0
    });
  }
});

// Check if user is authenticated (for AJAX requests)
app.get('/admin/check-auth', (req, res) => {
  console.log('Check auth session:', req.session);
  if (req.session && req.session.isAdmin) {
    res.status(200).json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// Login page
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/admin');
  }
  res.sendFile(path.join(__dirname, 'public/admin/login.html'));
});

// Login process
app.post('/admin/login', express.json(), async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', username);
    
    // Find user in database instead of accepting any credentials
    const User = mongoose.model('User');
    const user = await User.findOne({ 
      username: username,
      $or: [
        { role: 'admin' },
        { role: 'Admin' }
      ]
    });
    
    if (!user) {
      console.log('Admin login failed: User not found or not admin');
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check password - use bcrypt.compare for hashed passwords
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('Admin login failed: Invalid password');
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Set session
    req.session.isAdmin = true;
    req.session.userId = user._id;
    req.session.username = user.username;
    
    console.log('Admin login successful for:', username);
    return res.json({ success: true, redirectUrl: '/admin/dashboard' });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
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
  

// API endpoint for gallery items list
app.get('/admin/api/gallery-items', async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.json({ galleryItems: [] });
    }
    
    const Gallery = mongoose.model('Gallery');
    const galleryItems = await Gallery.find().sort({ createdAt: -1 });
    res.json({ galleryItems });
  } catch (err) {
    console.error('Error fetching gallery items:', err);
    res.status(500).json({ error: 'Failed to load gallery items' });
  }
});

// Alternative URL format for gallery items
app.get('/admin/gallery-items', async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.json({ galleryItems: [] });
    }
    
    const Gallery = mongoose.model('Gallery');
    const galleryItems = await Gallery.find().sort({ createdAt: -1 });
    res.json({ galleryItems });
  } catch (err) {
    console.error('Error fetching gallery items:', err);
    res.status(500).json({ error: 'Failed to load gallery items' });
  }
});

// API endpoint for contacts list
app.get('/admin/api/contacts', async (req, res) => {
  try {
    console.log('API contacts endpoint called');
    
    // Set content type explicitly to application/json
    res.setHeader('Content-Type', 'application/json');
    
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      console.log('Database not connected, returning empty contacts array');
      return res.json({ contacts: [] });
    }
    
    const Contact = mongoose.model('Contact');
    const contacts = await Contact.find().sort({ createdAt: -1 });
    
    console.log(`Found ${contacts.length} contacts`);
    return res.json({ contacts });
  } catch (err) {
    console.error('Error fetching contacts:', err);
    return res.status(500).json({ 
      error: 'Failed to load contacts',
      contacts: [] 
    });
  }
});

// API endpoint for single contact details
app.get('/admin/api/contacts/:id', async (req, res) => {
  try {
    console.log('API contact details endpoint called for ID:', req.params.id);
    
    // Set content type explicitly to application/json
    res.setHeader('Content-Type', 'application/json');
    
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      console.log('Database not connected, returning empty contact');
      return res.json({ 
        contact: {
          name: 'Not Found',
          email: 'N/A',
          phone: 'N/A',
          subject: 'N/A',
          message: 'Database connection error',
          status: 'new',
          createdAt: new Date()
        } 
      });
    }
    
    const Contact = mongoose.model('Contact');
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      console.log('Contact not found');
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    console.log('Returning contact:', contact);
    return res.json({ contact });
  } catch (err) {
    console.error('Error fetching contact details:', err);
    return res.status(500).json({ error: 'Failed to load contact details' });
  }
});

// API endpoint to update contact status
app.post('/admin/contacts/status/:id', async (req, res) => {
  try {
    console.log('Update contact status endpoint called for ID:', req.params.id);
    
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect(`/admin/contacts/view/${req.params.id}?error=Database not connected`);
    }
    
    const { status } = req.body;
    if (!status) {
      return res.redirect(`/admin/contacts/view/${req.params.id}?error=Status is required`);
    }
    
    const Contact = mongoose.model('Contact');
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!contact) {
      return res.redirect(`/admin/contacts?error=Contact not found`);
    }
    
    return res.redirect(`/admin/contacts/view/${req.params.id}?message=Status updated successfully`);
  } catch (err) {
    console.error('Error updating contact status:', err);
    return res.redirect(`/admin/contacts/view/${req.params.id}?error=Failed to update status`);
  }
});

// API endpoint to delete contact
app.post('/admin/contacts/delete/:id', async (req, res) => {
  try {
    console.log('Delete contact endpoint called for ID:', req.params.id);
    
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/contacts?error=Database not connected');
    }
    
    const Contact = mongoose.model('Contact');
    const contact = await Contact.findByIdAndDelete(req.params.id);
    
    if (!contact) {
      return res.redirect('/admin/contacts?error=Contact not found');
    }
    
    return res.redirect('/admin/contacts?message=Contact deleted successfully');
  } catch (err) {
    console.error('Error deleting contact:', err);
    return res.redirect('/admin/contacts?error=Failed to delete contact');
  }
});

// Route for viewing a single contact
app.get('/admin/contacts/view/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/contact-detail.html'));
});

// Products management
app.get('/admin/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/products.html'));
});

// Gallery management
app.get('/admin/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/gallery.html'));
});

// Testimonials management
app.get('/admin/testimonials', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/testimonials.html'));
});

// Contacts management
app.get('/admin/contacts', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/contacts.html'));
});

// Settings management
app.get('/admin/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/settings.html'));
});

// Dashboard page
app.get('/admin/dashboard', (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.redirect('/admin/login');
  }
  res.sendFile(path.join(__dirname, 'public/admin/dashboard.html'));
});

// Remove the line that uses the admin router
// Comment out or remove: app.use('/admin', adminRoutes);

  //end of dignity






// Add these new endpoints after your existing user-related endpoints

// First, ensure these directories exist



// Add graceful shutdown at the end of your file
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
const avatarDir = path.join(uploadDir, 'avatars');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir);
}

// Upload avatar
app.post("/api/user/avatar", isAuthenticated, (req, res) => {
  // Use a try-catch block around the multer middleware
  try {
    // Admin routes
app.get('/admin', (req, res) => {
  // Check if user is authenticated (you can implement this logic)
  // For now, just redirect to admin login
  res.redirect('/admin/login');
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/login.html'));
});

// Add routes for other admin pages
app.get('/admin/dashboard', (req, res) => {
  // You might want to add authentication check here
  res.sendFile(path.join(__dirname, 'public/admin/dashboard.html'));
});

app.get('/admin/products', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/products.html'));
});

app.get('/admin/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/gallery.html'));
});

app.get('/admin/testimonials', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/testimonials.html'));
});

app.get('/admin/contacts', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/contacts.html'));
});

app.get('/admin/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/settings.html'));
});
    avatarUpload.single('avatar')(req, res, async (err) => {
      if (err) {
        console.error("❌ Multer error:", err);
        return res.status(400).json({ 
          message: "Error uploading file: " + err.message,
          error: err.message,
          avatarUrl: 'photo.png'
        });
      }
      
      try {
        if (!req.file) {
          return res.status(400).json({ 
            message: "No file uploaded",
            avatarUrl: 'photo.png' 
          });
        }

        // Cloudinary returns the URL in req.file.path
        const avatarUrl = req.file.path;
        console.log("✅ File uploaded to Cloudinary:", avatarUrl);
        
        const user = await User.findByIdAndUpdate(
          req.user.id,
          { 
            $set: { 
              avatarUrl,
              lastActive: new Date()
            } 
          },
          { new: true }
        ).select('-password');

        if (!user) {
          return res.status(404).json({ 
            message: "User not found",
            avatarUrl: 'photo.png'
          });
        }

        res.json({ 
          message: "Avatar uploaded successfully",
          avatarUrl: user.avatarUrl || 'photo.png'
        });
      } catch (error) {
        console.error("❌ Error updating user with avatar:", error);
        res.status(500).json({ 
          message: "Error updating user with avatar",
          error: error.message,
          avatarUrl: 'photo.png'
        });
      }
    });
  } catch (error) {
    console.error("❌ Error in avatar upload route:", error);
    res.status(500).json({ 
      message: "Server error during upload",
      error: error.message,
      avatarUrl: 'photo.png'
    });
  }
});

// Add a specific endpoint for success.png
app.get('/api/success-icon-url', (req, res) => {
  try {
    // Check if Cloudinary is configured
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      return res.json({ url: 'success.png' });
    }
    
    // Generate URL using the specific public ID
    const url = cloudinary.url('success_tayqq4', {
      secure: true
    });
    
    console.log(`Success icon URL: ${url}`);
    res.json({ url });
  } catch (error) {
    console.error('Error generating success icon URL:', error);
    res.json({ url: 'success.png' });
  }
});


// Add Cloudinary helper functions
function getPublicIdFromUrl(url) {
  // Extract public_id from Cloudinary URL
  const regex = /\/v\d+\/([^/]+)\.\w+$/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Add a function to delete files from Cloudinary
async function deleteFileFromCloudinary(fileUrl) {
  try {
    const publicId = getPublicIdFromUrl(fileUrl);
    if (publicId) {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`File deleted from Cloudinary: ${publicId}`, result);
      return result;
    }
    return null;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
}

// Update file deletion endpoint
app.delete("/api/files/:fileId", isAuthenticated, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Find the file to get its Cloudinary URL
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }
    
    // Delete from Cloudinary first
    if (file.fileUrl) {
      await deleteFileFromCloudinary(file.fileUrl);
    }
    
    // Then delete from database
    await File.findByIdAndDelete(fileId);
    
    // Create audit log for file deletion
    await createAuditLog(
      req,
      'DELETE',
      'file',
      `${file.projectId}-${file.stageIndex}-${fileId}`,
      `File "${file.originalName}" deleted from approval stage ${file.stageIndex}`,
      {
        before: file.toObject(),
        after: null
      }
    );
    
    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ message: "Error deleting file", error: error.message });
  }
});



// This should be at the END of your routes
// Redirect unknown routes to login or index
app.use((req, res, next) => {
  // Don't catch API or admin routes
  if (req.path.startsWith("/api/") || req.path.startsWith("/admin/")) {
    return next();
  }
  
  // For debugging
  console.log('Catch-all route accessed for:', req.path);
  
  // Redirect to index instead of login
  res.redirect("/");
}); // Update ticket route


router.post("/api/register", async (req, res) => {
  const { username, password, role, } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate a token (optional)
    const token = jwt.sign({ id: user._id, role: user.role }, "secret-key", {
      expiresIn: "1h",
    });

    res.status(200).json({ message: "Login successful", role: user.role });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

function authorizeRoles(allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user.role; // Assume `req.user` contains the authenticated user info

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    next();
  };
}

app.use(router);

// Gallery form routes
app.get('/admin/gallery/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/gallery-form.html'));
});

app.get('/admin/gallery/edit/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/gallery-form.html'));
});

// API endpoint to get a single gallery item for editing
app.get('/api/admin/gallery/:id', async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }
    
    const Gallery = mongoose.model('Gallery');
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }
    
    res.json({ item });
  } catch (err) {
    console.error('Error fetching gallery item:', err);
    res.status(500).json({ error: 'Failed to fetch gallery item' });
  }
});

// POST route for adding a new gallery item
app.post('/admin/gallery/add', galleryUpload.single('image'), async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/gallery?error=Database not connected');
    }
    
    // Get form data
    const { title, description, category, productCategory } = req.body;
    
    // Validate required fields
    if (!title || !category || !req.file) {
      return res.redirect('/admin/gallery/add?error=Missing required fields');
    }
    
    // Create new gallery item
    const Gallery = mongoose.model('Gallery');
    const newItem = new Gallery({
      title,
      description,
      category,
      productCategory: category === 'products' ? productCategory : '',
      imageUrl: req.file.path // Cloudinary returns the URL in req.file.path
    });
    
    await newItem.save();
    
    // Redirect to gallery list with success message
    res.redirect('/admin/gallery?message=Gallery item added successfully');
  } catch (err) {
    console.error('Error adding gallery item:', err);
    res.redirect('/admin/gallery/add?error=' + encodeURIComponent(err.message));
  }
});

// POST route for editing a gallery item
app.post('/admin/gallery/edit/:id', galleryUpload.single('image'), async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/gallery?error=Database not connected');
    }
    
    const itemId = req.params.id;
    const { title, description, category, productCategory } = req.body;
    
    // Validate required fields
    if (!title || !category) {
      return res.redirect(`/admin/gallery/edit/${itemId}?error=Missing required fields`);
    }
    
    // Find the gallery item
    const Gallery = mongoose.model('Gallery');
    const item = await Gallery.findById(itemId);
    
    if (!item) {
      return res.redirect('/admin/gallery?error=Gallery item not found');
    }
    
    // Update fields
    item.title = title;
    item.description = description;
    item.category = category;
    item.productCategory = category === 'products' ? productCategory : '';
    
    // Update image if a new one was uploaded
    if (req.file) {
      // If there's an existing image, you might want to delete it from Cloudinary
      if (item.imageUrl) {
        try {
          const publicId = getPublicIdFromUrl(item.imageUrl);
          if (publicId) {
            await deleteFileFromCloudinary(item.imageUrl);
          }
        } catch (deleteErr) {
          console.error('Error deleting old image:', deleteErr);
          // Continue with the update even if deletion fails
        }
      }
      
      item.imageUrl = req.file.path;
    }
    
    await item.save();
    
    // Redirect to gallery list with success message
    res.redirect('/admin/gallery?message=Gallery item updated successfully');
  } catch (err) {
    console.error('Error updating gallery item:', err);
    res.redirect(`/admin/gallery/edit/${req.params.id}?error=` + encodeURIComponent(err.message));
  }
});

// POST route for deleting a gallery item
app.post('/admin/gallery/delete/:id', async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/gallery?error=Database not connected');
    }
    
    const itemId = req.params.id;
    
    // Find the gallery item
    const Gallery = mongoose.model('Gallery');
    const item = await Gallery.findById(itemId);
    
    if (!item) {
      return res.redirect('/admin/gallery?error=Gallery item not found');
    }
    
    // Delete image from Cloudinary if it exists
    if (item.imageUrl) {
      try {
        await deleteFileFromCloudinary(item.imageUrl);
      } catch (deleteErr) {
        console.error('Error deleting image from Cloudinary:', deleteErr);
        // Continue with deletion even if Cloudinary deletion fails
      }
    }
    
    // Delete the item from the database
    await Gallery.findByIdAndDelete(itemId);
    
    // Redirect to gallery list with success message
    res.redirect('/admin/gallery?message=Gallery item deleted successfully');
  } catch (err) {
    console.error('Error deleting gallery item:', err);
    res.redirect('/admin/gallery?error=' + encodeURIComponent(err.message));
  }
});

// Product form routes
app.get('/admin/products/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/product-form.html'));
});

app.get('/admin/products/edit/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/product-form.html'));
});

// API endpoint to get a single product for editing
app.get('/api/admin/products/:id', async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const Product = mongoose.model('Product');
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ product });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST route for adding a new product
app.post('/admin/products/add', productUpload.single('image'), async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/products?error=Database not connected');
    }
    
    // Get form data
    const { name, description, category, featured } = req.body;
    
    // Validate required fields
    if (!name || !description || !category || !req.file) {
      return res.redirect('/admin/products/add?error=Missing required fields');
    }
    
    // Create new product
    const Product = mongoose.model('Product');
    const newProduct = new Product({
      name,
      description,
      category,
      featured: featured === 'on' || featured === true,
      imageUrl: req.file.path // Cloudinary returns the URL in req.file.path
    });
    
    await newProduct.save();
    
    // Redirect to products list with success message
    res.redirect('/admin/products?message=Product added successfully');
  } catch (err) {
    console.error('Error adding product:', err);
    res.redirect('/admin/products/add?error=' + encodeURIComponent(err.message));
  }
});

// POST route for editing a product
app.post('/admin/products/edit/:id', productUpload.single('image'), async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/products?error=Database not connected');
    }
    
    const productId = req.params.id;
    const { name, description, category, featured } = req.body;
    
    // Validate required fields
    if (!name || !description || !category) {
      return res.redirect(`/admin/products/edit/${productId}?error=Missing required fields`);
    }
    
    // Find the product
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    // Update fields
    product.name = name;
    product.description = description;
    product.category = category;
    product.featured = featured === 'on' || featured === true;
    
    // Update image if a new one was uploaded
    if (req.file) {
      // If there's an existing image, you might want to delete it from Cloudinary
      if (product.imageUrl) {
        try {
          await deleteImage(product.imageUrl);
        } catch (deleteErr) {
          console.error('Error deleting old image:', deleteErr);
          // Continue with the update even if deletion fails
        }
      }
      
      product.imageUrl = req.file.path;
    }
    
    await product.save();
    
    // Redirect to products list with success message
    res.redirect('/admin/products?message=Product updated successfully');
  } catch (err) {
    console.error('Error updating product:', err);
    res.redirect(`/admin/products/edit/${req.params.id}?error=` + encodeURIComponent(err.message));
  }
});

// POST route for deleting a product
app.post('/admin/products/delete/:id', async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/products?error=Database not connected');
    }
    
    const productId = req.params.id;
    
    // Find the product
    const Product = mongoose.model('Product');
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    // Delete image from Cloudinary if it exists
    if (product.imageUrl) {
      try {
        await deleteImage(product.imageUrl);
      } catch (deleteErr) {
        console.error('Error deleting image from Cloudinary:', deleteErr);
        // Continue with deletion even if Cloudinary deletion fails
      }
    }
    
    // Delete the product from the database
    await Product.findByIdAndDelete(productId);
    
    // Redirect to products list with success message
    res.redirect('/admin/products?message=Product deleted successfully');
  } catch (err) {
    console.error('Error deleting product:', err);
    res.redirect('/admin/products?error=' + encodeURIComponent(err.message));
  }
});

// Testimonial form routes
app.get('/admin/testimonials/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/testimonial-form.html'));
});

app.get('/admin/testimonials/edit/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/testimonial-form.html'));
});

// API endpoint to get a single testimonial for editing
app.get('/api/testimonials/:id', async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    
    const Testimonial = mongoose.model('Testimonial');
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    
    res.json({ testimonial });
  } catch (err) {
    console.error('Error fetching testimonial:', err);
    res.status(500).json({ error: 'Failed to fetch testimonial' });
  }
});

// POST route for adding a new testimonial
app.post('/admin/testimonials/add', testimonialUpload.single('image'), async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/testimonials?error=Database not connected');
    }
    
    // Get form data
    const { name, position, company, content, rating, featured } = req.body;
    
    // Validate required fields
    if (!name || !position || !content || !rating) {
      return res.redirect('/admin/testimonials/add?error=Missing required fields');
    }
    
    // Create new testimonial
    const Testimonial = mongoose.model('Testimonial');
    const newTestimonial = new Testimonial({
      name,
      position,
      company: company || '',
      content,
      rating: parseInt(rating),
      featured: featured === 'on' || featured === true,
      imageUrl: req.file ? req.file.path : ''
    });
    
    await newTestimonial.save();
    
    // Redirect to testimonials list with success message
    res.redirect('/admin/testimonials?message=Testimonial added successfully');
  } catch (err) {
    console.error('Error adding testimonial:', err);
    res.redirect('/admin/testimonials/add?error=' + encodeURIComponent(err.message));
  }
});

// POST route for editing a testimonial
app.post('/admin/testimonials/edit/:id', testimonialUpload.single('image'), async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/testimonials?error=Database not connected');
    }
    
    const testimonialId = req.params.id;
    const { name, position, company, content, rating, featured } = req.body;
    
    // Validate required fields
    if (!name || !position || !content || !rating) {
      return res.redirect(`/admin/testimonials/edit/${testimonialId}?error=Missing required fields`);
    }
    
    // Find the testimonial
    const Testimonial = mongoose.model('Testimonial');
    const testimonial = await Testimonial.findById(testimonialId);
    
    if (!testimonial) {
      return res.redirect('/admin/testimonials?error=Testimonial not found');
    }
    
    // Update fields
    testimonial.name = name;
    testimonial.position = position;
    testimonial.company = company || '';
    testimonial.content = content;
    testimonial.rating = parseInt(rating);
    testimonial.featured = featured === 'on' || featured === true;
    
    // Update image if a new one was uploaded
    if (req.file) {
      // If there's an existing image, you might want to delete it from Cloudinary
      if (testimonial.imageUrl) {
        try {
          await deleteImage(testimonial.imageUrl);
        } catch (deleteErr) {
          console.error('Error deleting old image:', deleteErr);
          // Continue with the update even if deletion fails
        }
      }
      
      testimonial.imageUrl = req.file.path;
    }
    
    await testimonial.save();
    
    // Redirect to testimonials list with success message
    res.redirect('/admin/testimonials?message=Testimonial updated successfully');
  } catch (err) {
    console.error('Error updating testimonial:', err);
    res.redirect(`/admin/testimonials/edit/${req.params.id}?error=` + encodeURIComponent(err.message));
  }
});

// POST route for deleting a testimonial
app.post('/admin/testimonials/delete/:id', async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/testimonials?error=Database not connected');
    }
    
    const testimonialId = req.params.id;
    
    // Find the testimonial
    const Testimonial = mongoose.model('Testimonial');
    const testimonial = await Testimonial.findById(testimonialId);
    
    if (!testimonial) {
      return res.redirect('/admin/testimonials?error=Testimonial not found');
    }
    
    // Delete image from Cloudinary if it exists
    if (testimonial.imageUrl) {
      try {
        await deleteImage(testimonial.imageUrl);
      } catch (deleteErr) {
        console.error('Error deleting image from Cloudinary:', deleteErr);
        // Continue with deletion even if Cloudinary deletion fails
      }
    }
    
    // Delete the testimonial from the database
    await Testimonial.findByIdAndDelete(testimonialId);
    
    // Redirect to testimonials list with success message
    res.redirect('/admin/testimonials?message=Testimonial deleted successfully');
  } catch (err) {
    console.error('Error deleting testimonial:', err);
    res.redirect('/admin/testimonials?error=' + encodeURIComponent(err.message));
  }
});

// POST route for saving settings
app.post('/admin/settings', async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/settings?error=Database not connected');
    }
    
    // Get form data
    const {
      siteName,
      siteTagline,
      contactEmail,
      contactPhone,
      contactAddress,
      socialFacebook,
      socialInstagram,
      socialTwitter,
      aboutText,
      footerText
    } = req.body;
    
    // Validate required fields
    if (!siteName || !contactEmail) {
      return res.redirect('/admin/settings?error=Site name and contact email are required');
    }
    
    // Find or create settings
    const Setting = mongoose.model('Setting');
    let settings = await Setting.findOne();
    
    if (!settings) {
      settings = new Setting();
    }
    
    // Update fields
    settings.siteName = siteName;
    settings.siteTagline = siteTagline || '';
    settings.contactEmail = contactEmail;
    settings.contactPhone = contactPhone || '';
    settings.contactAddress = contactAddress || '';
    settings.socialFacebook = socialFacebook || '';
    settings.socialInstagram = socialInstagram || '';
    settings.socialTwitter = socialTwitter || '';
    settings.aboutText = aboutText || '';
    settings.footerText = footerText || '';
    
    await settings.save();
    
    // Redirect to settings page with success message
    res.redirect('/admin/settings?message=Settings saved successfully');
  } catch (err) {
    console.error('Error saving settings:', err);
    res.redirect('/admin/settings?error=' + encodeURIComponent(err.message));
  }
});

// POST route for updating hero slides
app.post('/admin/settings/slide/:index', heroSlideUpload.single('image'), async (req, res) => {
  try {
    if (!isConnected() || mongoose.connection.readyState !== 1) {
      return res.redirect('/admin/settings?error=Database not connected');
    }
    
    const slideIndex = parseInt(req.params.index);
    
    // Validate slide index
    if (isNaN(slideIndex) || slideIndex < 0 || slideIndex > 5) {
      return res.redirect('/admin/settings?error=Invalid slide index');
    }
    
    // Check if image was uploaded
    if (!req.file) {
      return res.redirect(`/admin/settings/slide/${slideIndex}?error=No image uploaded`);
    }
    
    // Find settings
    const Setting = mongoose.model('Setting');
    let settings = await Setting.findOne();
    
    if (!settings) {
      settings = new Setting();
      settings.heroSlides = Array(6).fill('');
    }
    
    // Ensure heroSlides array exists
    if (!settings.heroSlides) {
      settings.heroSlides = Array(6).fill('');
    }
    
    // If there's an existing slide image, delete it from Cloudinary
    if (settings.heroSlides[slideIndex]) {
      try {
        await deleteImage(settings.heroSlides[slideIndex]);
      } catch (deleteErr) {
        console.error('Error deleting old slide image:', deleteErr);
        // Continue with the update even if deletion fails
      }
    }
    
    // Update the slide with the new image URL
    settings.heroSlides[slideIndex] = req.file.path;
    
    await settings.save();
    
    // Redirect to settings page with success message
    res.redirect('/admin/settings?message=Slide updated successfully');
  } catch (err) {
    console.error('Error updating slide:', err);
    res.redirect(`/admin/settings/slide/${req.params.index}?error=` + encodeURIComponent(err.message));
  }
});

// GET route for slide form
app.get('/admin/settings/slide/:index', (req, res) => {
  const slideIndex = parseInt(req.params.index);
  
  // Validate slide index
  if (isNaN(slideIndex) || slideIndex < 0 || slideIndex > 5) {
    return res.redirect('/admin/settings?error=Invalid slide index');
  }
  
  res.sendFile(path.join(__dirname, 'public/admin/slide-form.html'));
});

// Update the server startup code at the end of your file
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // Connect to MongoDB after server starts
  connectToMongoDB();
});


