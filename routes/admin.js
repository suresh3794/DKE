
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Setting = mongoose.model('Setting');
const Product = mongoose.model('Product');
const Gallery = mongoose.model('Gallery');
const Testimonial = mongoose.model('Testimonial');
const User = mongoose.model('User');
const Contact = mongoose.model('Contact');

// Add this at the top of your file, after requiring mongoose
const appLogger = console; // Will be overridden by app.locals.appLogger if available

// Import Cloudinary configuration
const { 
  galleryUpload, 
  productUpload, 
  testimonialUpload, 
  heroSlideUpload,
  deleteImage 
} = require('../config/cloudinary');

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
};

// Admin dashboard
router.get('/', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/dashboard.html'));
});

// API endpoint for dashboard data
router.get('/api/dashboard', isAuthenticated, async (req, res) => {
  try {
    console.log('Dashboard API endpoint called');
    
    const productCount = await Product.countDocuments();
    const galleryCount = await Gallery.countDocuments();
    const testimonialCount = await Testimonial.countDocuments();
    const newMessageCount = await Contact.countDocuments({ status: 'new' });
    
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
router.get('/check-auth', (req, res) => {
  console.log('Check auth session:', req.session);
  if (req.session && req.session.isAuthenticated) {
    res.status(200).json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// Login page
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/admin');
  }
  res.sendFile(path.join(__dirname, '../public/admin/login.html'));
});

// Login process
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    
    if (!user || user.password !== password) {
      // Check if request expects JSON
      if (req.headers['content-type'] === 'application/json') {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      return res.redirect('/admin/login?error=' + encodeURIComponent('Invalid username or password'));
    }
    
    // Set session variables
    req.session.userId = user._id;
    req.session.isAuthenticated = true;
    
    // Log session data for debugging
    console.log('Session data:', req.session);
    
    // Save session before redirecting
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        if (req.headers['content-type'] === 'application/json') {
          return res.status(500).json({ error: 'Login failed' });
        }
        return res.redirect('/admin/login?error=' + encodeURIComponent('Login failed'));
      }
      
      // Check if request expects JSON
      if (req.headers['content-type'] === 'application/json') {
        return res.json({ success: true });
      }
      res.redirect('/admin');
    });
  } catch (err) {
    console.error(err);
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ error: 'Login failed' });
    }
    res.redirect('/admin/login?error=' + encodeURIComponent('Login failed'));
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// API endpoint for gallery items list
router.get('/api/admin/gallery-items', isAuthenticated, async (req, res) => {
  try {
    const galleryItems = await Gallery.find().sort({ createdAt: -1 });
    res.json({ galleryItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load gallery items' });
  }
});

// Add this route as well (alternative URL format)
router.get('/gallery-items', isAuthenticated, async (req, res) => {
  try {
    const galleryItems = await Gallery.find().sort({ createdAt: -1 });
    res.json({ galleryItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load gallery items' });
  }
});
// Products management
router.get('/products', isAuthenticated, async (req, res) => {
  try {
    // We'll still fetch products to check if there's an error,
    // but we won't pass them to the template anymore
    await Product.find();
    
    // Send the HTML file
    res.sendFile(path.join(__dirname, '../public/admin/products.html'));
  } catch (err) {
    console.error(err);
    res.sendFile(path.join(__dirname, '../public/admin/products.html'));
  }
});

// Add product form
router.get('/products/add', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/product-form.html'));
});

// Add product process
router.post('/products/add', productUpload.single('image'), async (req, res) => {
  try {
    const { name, description, category, featured } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image' });
    }
    
    const newProduct = new Product({
      name,
      description,
      category,
      imageUrl: req.file.path, // Cloudinary URL
      featured: featured === 'on' ? true : false
    });
    
    await newProduct.save();
    
    res.redirect('/admin/products?message=Product added successfully');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Edit product form
router.get('/products/edit/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    // Instead of rendering a template, send the HTML file
    // You'll need to fetch the product data on the client side
    res.sendFile(path.join(__dirname, '../public/admin/product-form.html'));
  } catch (err) {
    console.error(err);
    res.redirect('/admin/products?error=Failed to load product');
  }
});

// Edit product process
router.post('/products/edit/:id', isAuthenticated, productUpload.single('image'), async (req, res) => {
  try {
    const { name, description, category, featured } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    product.name = name;
    product.description = description;
    product.category = category;
    product.featured = featured === 'on' ? true : false;
    
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (product.imageUrl) {
        await deleteImage(product.imageUrl);
      }
      
      product.imageUrl = req.file.path; // Cloudinary URL
    }
    
    await product.save();
    
    res.redirect('/admin/products?message=Product updated successfully');
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/products/edit/${req.params.id}?error=Failed to update product`);
  }
});

// Delete product
router.post('/products/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    // Delete image from Cloudinary
    if (product.imageUrl) {
      await deleteImage(product.imageUrl);
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.redirect('/admin/products?message=Product deleted successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/products?error=Failed to delete product');
  }
});

// Gallery management
router.get('/gallery', isAuthenticated, async (req, res) => {
  try {
    // We'll still fetch gallery items to check if there's an error,
    // but we won't pass them to the template anymore
    await Gallery.find();
    
    // Send the HTML file
    res.sendFile(path.join(__dirname, '../public/admin/gallery.html'));
  } catch (err) {
    console.error(err);
    res.sendFile(path.join(__dirname, '../public/admin/gallery.html'));
  }
});

// Add gallery item form
router.get('/gallery/add', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/gallery-form.html'));
});

// Add gallery item process
router.post('/gallery/add', isAuthenticated, galleryUpload.single('image'), async (req, res) => {
  try {
    const { title, description, category, productCategory } = req.body;
    
    if (!req.file) {
      return res.render('admin/gallery-form', { 
        error: 'Please upload an image',
        item: req.body,
        formAction: '/admin/gallery/add'
      });
    }
    
    const newGalleryItem = new Gallery({
      title,
      description,
      category,
      productCategory: category === 'products' ? productCategory : '',
      imageUrl: req.file.path // Cloudinary URL
    });
    
    await newGalleryItem.save();
    
    res.redirect('/admin/gallery?message=Gallery item added successfully');
  } catch (err) {
    console.error(err);
    res.render('admin/gallery-form', { 
      error: 'Failed to add gallery item',
      item: req.body,
      formAction: '/admin/gallery/add'
    });
  }
});

// Edit gallery item form
router.get('/gallery/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.redirect('/admin/gallery?error=Gallery item not found');
    }
    
    res.sendFile(path.join(__dirname, '../public/admin/gallery-form.html'));
  } catch (err) {
    console.error(err);
    res.redirect('/admin/gallery?error=Failed to load gallery item');
  }
});

// Edit gallery item process
router.post('/gallery/edit/:id', isAuthenticated, galleryUpload.single('image'), async (req, res) => {
  try {
    const { title, description, category, productCategory } = req.body;
    
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.redirect('/admin/gallery?error=Gallery item not found');
    }
    
    item.title = title;
    item.description = description;
    item.category = category;
    item.productCategory = category === 'products' ? productCategory : '';
    
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (item.imageUrl) {
        await deleteImage(item.imageUrl);
      }
      
      item.imageUrl = req.file.path; // Cloudinary URL
    }
    
    await item.save();
    
    res.redirect('/admin/gallery?message=Gallery item updated successfully');
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/gallery/edit/${req.params.id}?error=Failed to update gallery item`);
  }
});

// Delete gallery item
router.post('/gallery/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.redirect('/admin/gallery?error=Gallery item not found');
    }
    
    // Delete image from Cloudinary
    if (item.imageUrl) {
      await deleteImage(item.imageUrl);
    }
    
    await Gallery.findByIdAndDelete(req.params.id);
    
    res.redirect('/admin/gallery?message=Gallery item deleted successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/gallery?error=Failed to delete gallery item');
  }
});

// Testimonials management
router.get('/testimonials', isAuthenticated, async (req, res) => {
  try {
    // Send the HTML file
    res.sendFile(path.join(__dirname, '../public/admin/testimonials.html'));
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Add testimonial form
router.get('/testimonials/add', isAuthenticated, (req, res) => {
  try {
    // Send the HTML file
    res.sendFile(path.join(__dirname, '../public/admin/testimonial-form.html'));
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Add testimonial process
router.post('/testimonials/add', isAuthenticated, testimonialUpload.single('image'), async (req, res) => {
  try {
    const { name, position, company, content, rating, featured } = req.body;
    
    const newTestimonial = new Testimonial({
      name,
      position,
      company,
      content,
      rating: parseInt(rating) || 5,
      featured: featured === 'on' ? true : false,
      imageUrl: req.file ? req.file.path : '' // Cloudinary URL or empty
    });
    
    await newTestimonial.save();
    
    res.redirect('/admin/testimonials?message=Testimonial added successfully');
  } catch (err) {
    console.error(err);
    res.render('admin/testimonial-form', { 
      error: 'Failed to add testimonial',
      testimonial: req.body,
      formAction: '/admin/testimonials/add'
    });
  }
});

// Edit testimonial form
router.get('/testimonials/edit/:id', isAuthenticated, async (req, res) => {
  try {
    // Check if testimonial exists
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.redirect('/admin/testimonials?error=Testimonial not found');
    }
    
    // Send the HTML file
    res.sendFile(path.join(__dirname, '../public/admin/testimonial-form.html'));
  } catch (err) {
    console.error(err);
    res.redirect('/admin/testimonials?error=Failed to load testimonial');
  }
});

// Edit testimonial process
router.post('/testimonials/edit/:id', isAuthenticated, testimonialUpload.single('image'), async (req, res) => {
  try {
    const { name, position, company, content, rating, featured } = req.body;
    
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.redirect('/admin/testimonials?error=Testimonial not found');
    }
    
    testimonial.name = name;
    testimonial.position = position;
    testimonial.company = company;
    testimonial.content = content;
    testimonial.rating = parseInt(rating) || 5;
    testimonial.featured = featured === 'on' ? true : false;
    
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (testimonial.imageUrl) {
        await deleteImage(testimonial.imageUrl);
      }
      
      testimonial.imageUrl = req.file.path; // Cloudinary URL
    }
    
    await testimonial.save();
    
    res.redirect('/admin/testimonials?message=Testimonial updated successfully');
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/testimonials/edit/${req.params.id}?error=Failed to update testimonial`);
  }
});

// Delete testimonial
router.post('/testimonials/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.redirect('/admin/testimonials?error=Testimonial not found');
    }
    
    // Delete image file if it exists
    if (testimonial.imageUrl) {
      const imagePath = path.join(__dirname, '../public', testimonial.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Testimonial.findByIdAndDelete(req.params.id);
    
    res.redirect('/admin/testimonials?message=Testimonial deleted successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/testimonials?error=Failed to delete testimonial');
  }
});

// Contact messages management
router.get('/contacts', isAuthenticated, async (req, res) => {
  try {
    const logger = req.app.locals.appLogger || appLogger;
    // We'll still fetch contacts to check if there's an error,
    // but we won't pass them to the template anymore
    await Contact.find();
    logger.log('Contacts fetched successfully');
    
    // Send the HTML file with query parameters for messages
    const url = new URL('/admin/contacts.html', 'http://localhost');
    if (req.query.message) url.searchParams.set('message', req.query.message);
    if (req.query.error) url.searchParams.set('error', req.query.error);
    
    res.sendFile(path.join(__dirname, '../public/admin/contacts.html'));
  } catch (err) {
    console.error(err);
    res.sendFile(path.join(__dirname, '../public/admin/contacts.html'));
  }
});

// API endpoint for contacts list
router.get('/api/contacts', isAuthenticated, async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ contacts });
  } catch (err) {
    console.error('Error in /api/contacts:', err);
    res.status(500).json({ error: 'Failed to load contact messages' });
  }
});

// API endpoint for contact details
router.get('/api/contacts/:id', isAuthenticated, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Mark as read if it's new
    if (contact.status === 'new') {
      contact.status = 'read';
      await contact.save();
    }
    
    res.json({ contact });
  } catch (err) {
    console.error('Error in /api/contacts/:id:', err);
    res.status(500).json({ error: 'Failed to load contact details' });
  }
});

// View contact message details
router.get('/contacts/view/:id', isAuthenticated, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.redirect('/admin/contacts?error=Message not found');
    }
    
    // Mark as read if it's new
    if (contact.status === 'new') {
      contact.status = 'read';
      await contact.save();
    }
    
    res.sendFile(path.join(__dirname, '../public/admin/contact-detail.html'));
  } catch (err) {
    console.error(err);
    res.redirect('/admin/contacts?error=Failed to load message');
  }
});

// Update contact message status
router.post('/contacts/status/:id', isAuthenticated, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
      return res.redirect(`/admin/contacts/view/${req.params.id}?error=Invalid status`);
    }
    
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.redirect('/admin/contacts?error=Message not found');
    }
    
    contact.status = status;
    await contact.save();
    
    res.redirect(`/admin/contacts/view/${req.params.id}?message=Status updated successfully`);
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/contacts/view/${req.params.id}?error=Failed to update status`);
  }
});

// Delete contact message
router.post('/contacts/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.redirect('/admin/contacts?error=Message not found');
    }
    
    await Contact.findByIdAndDelete(req.params.id);
    
    res.redirect('/admin/contacts?message=Message deleted successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/contacts?error=Failed to delete message');
  }
});

// Settings management
router.get('/settings', isAuthenticated, async (req, res) => {
  try {
    // We'll still check if settings exist, but we won't pass them to the template anymore
    let settings = await Setting.findOne();
    
    if (!settings) {
      settings = new Setting();
      await settings.save();
    }
    
    // Send the HTML file
    res.sendFile(path.join(__dirname, '../public/admin/settings.html'));
  } catch (err) {
    console.error(err);
    res.sendFile(path.join(__dirname, '../public/admin/settings.html'));
  }
});

// Update settings
router.post('/settings', isAuthenticated, async (req, res) => {
  try {
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
    
    // Get settings or create default if not exists
    let settings = await Setting.findOne();
    
    if (!settings) {
      settings = new Setting();
    }
    
    // Update settings
    settings.siteName = siteName;
    settings.siteTagline = siteTagline;
    settings.contactEmail = contactEmail;
    settings.contactPhone = contactPhone;
    settings.contactAddress = contactAddress;
    settings.socialFacebook = socialFacebook;
    settings.socialInstagram = socialInstagram;
    settings.socialTwitter = socialTwitter;
    settings.aboutText = aboutText;
    settings.footerText = footerText;
    settings.updatedAt = Date.now();
    
    await settings.save();
    
    res.redirect('/admin/settings?message=Settings updated successfully');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/settings?error=Failed to update settings');
  }
});

// Edit slide form
router.get('/settings/slide/:index', isAuthenticated, async (req, res) => {
  try {
    const slideIndex = parseInt(req.params.index);
    
    if (isNaN(slideIndex) || slideIndex < 0 || slideIndex > 5) {
      return res.redirect('/admin/settings?error=Invalid slide index');
    }
    
    // Send the HTML file
    res.sendFile(path.join(__dirname, '../public/admin/slide-form.html'));
  } catch (err) {
    console.error(err);
    res.redirect('/admin/settings?error=Failed to load slide editor');
  }
});

// Update slide
router.post('/settings/slide/:index', isAuthenticated, heroSlideUpload.single('image'), async (req, res) => {
  try {
    console.log('Slide update request received for index:', req.params.index);
    console.log('File uploaded:', req.file);
    
    const slideIndex = parseInt(req.params.index);
    
    if (isNaN(slideIndex) || slideIndex < 0 || slideIndex > 5) {
      return res.redirect('/admin/settings?error=Invalid slide index');
    }
    
    if (!req.file) {
      return res.render('admin/slide-form', { 
        slideIndex,
        error: 'Please upload an image',
        currentImage: null
      });
    }
    
    // Get settings
    let settings = await Setting.findOne();
    
    if (!settings) {
      settings = new Setting();
    }
    
    // Initialize heroSlides array if it doesn't exist
    if (!settings.heroSlides) {
      settings.heroSlides = Array(6).fill('');
    }
    
    // Delete old image from Cloudinary if it exists
    if (settings.heroSlides[slideIndex]) {
      await deleteImage(settings.heroSlides[slideIndex]);
    }
    
    // Add more logging
    console.log('Settings before update:', settings);
    
    // Update slide image with Cloudinary URL
    settings.heroSlides[slideIndex] = req.file.path;
    settings.updatedAt = Date.now();
    
    console.log('Settings after update:', settings);
    
    await settings.save();
    console.log('Settings saved successfully');
    
    res.redirect(`/admin/settings?message=Slide ${slideIndex + 1} updated successfully`);
  } catch (err) {
    console.error('Error updating slide:', err);
    res.redirect(`/admin/settings/slide/${req.params.index}?error=Failed to update slide`);
  }
});

// API endpoint for gallery item details
router.get('/api/admin/gallery/:id', isAuthenticated, async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }
    
    res.json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load gallery item' });
  }
});

// API endpoint for gallery items list
router.get('/api/admin/gallery-items', isAuthenticated, async (req, res) => {
  try {
    const galleryItems = await Gallery.find().sort({ createdAt: -1 });
    res.json({ galleryItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load gallery items' });
  }
});

// Add this route as well (alternative URL format)
router.get('/gallery-items', isAuthenticated, async (req, res) => {
  try {
    const galleryItems = await Gallery.find().sort({ createdAt: -1 });
    res.json({ galleryItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load gallery items' });
  }
});

// API endpoint for products list - version 1
router.get('/api/products-list', async (req, res) => {
  try {
    // Removed authentication for testing
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    console.error('Error in /api/products-list:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// API endpoint for products list - version 2
router.get('/api/admin/products', async (req, res) => {
  try {
    // Removed authentication for testing
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    console.error('Error in /api/admin/products:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// API endpoint for products list - version 3
router.get('/products-list', async (req, res) => {
  try {
    // Removed authentication for testing
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    console.error('Error in /products-list:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// API endpoint for products list - version 4
router.get('/admin/products-list', async (req, res) => {
  try {
    // Removed authentication for testing
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ products });
  } catch (err) {
    console.error('Error in /admin/products-list:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Fallback endpoint with hardcoded products
router.get('/api/fallback-products', (req, res) => {
  const fallbackProducts = [
    {
      _id: '1',
      name: 'Fallback Product 1',
      description: 'This is a fallback product',
      category: 'cooking',
      imageUrl: '/images/placeholder.jpg',
      featured: true
    },
    {
      _id: '2',
      name: 'Fallback Product 2',
      description: 'This is another fallback product',
      category: 'refrigeration',
      imageUrl: '/images/placeholder.jpg',
      featured: false
    }
  ];
  
  res.json({ products: fallbackProducts });
});

// API endpoint for product details
router.get('/api/admin/products/:id', isAuthenticated, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

// API endpoint for contacts list
router.get('/api/admin/contacts', isAuthenticated, async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ contacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load contacts' });
  }
});

// API endpoint for settings - with /api/admin prefix
router.get('/api/admin/settings', isAuthenticated, async (req, res) => {
  try {
    const settings = await Setting.findOne() || {};
    res.json({ settings });
  } catch (err) {
    console.error('Error in /api/admin/settings:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// API endpoint for testimonials list
router.get('/api/testimonials', isAuthenticated, async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json({ testimonials });
  } catch (err) {
    console.error('Error in /api/testimonials:', err);
    res.status(500).json({ error: 'Failed to load testimonials' });
  }
});

// API endpoint for testimonial details
router.get('/api/testimonials/:id', isAuthenticated, async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    
    res.json({ testimonial });
  } catch (err) {
    console.error('Error in /api/testimonials/:id:', err);
    res.status(500).json({ error: 'Failed to load testimonial' });
  }
});

// Add a simple test endpoint
router.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Add another test endpoint without authentication
router.get('/test', (req, res) => {
  res.json({ message: 'Admin route is working!' });
});

// Debug endpoint - no authentication, no database query
router.get('/api/debug', (req, res) => {
  res.json({ status: 'ok', message: 'API is working' });
});

// Debug endpoint to check Gallery model
router.get('/api/debug/gallery', async (req, res) => {
  try {
    // Check if Gallery model is defined
    if (!Gallery) {
      return res.status(500).json({ error: 'Gallery model is not defined' });
    }
    
    // Try to get a count of gallery items
    const count = await Gallery.countDocuments();
    
    // Return debug info
    res.json({ 
      status: 'success', 
      message: 'Gallery model is working',
      count: count,
      modelName: Gallery.modelName,
      collectionName: Gallery.collection.name
    });
  } catch (err) {
    console.error('Debug gallery error:', err);
    res.status(500).json({ 
      error: 'Error in debug endpoint', 
      message: err.message,
      stack: err.stack
    });
  }
});

// Debug endpoint to check Product model
router.get('/api/debug/products', async (req, res) => {
  try {
    // Check if Product model is defined
    if (!Product) {
      return res.status(500).json({ error: 'Product model is not defined' });
    }
    
    // Try to get a count of products
    const count = await Product.countDocuments();
    
    // Return debug info
    res.json({ 
      status: 'success', 
      message: 'Product model is working',
      count: count,
      modelName: Product.modelName,
      collectionName: Product.collection.name
    });
  } catch (err) {
    console.error('Debug products error:', err);
    res.status(500).json({ 
      error: 'Error in debug endpoint', 
      message: err.message,
      stack: err.stack
    });
  }
});

module.exports = router;
