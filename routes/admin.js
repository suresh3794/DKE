const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Setting = require('../models/Setting');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Models
const User = mongoose.model('User');
const Gallery = mongoose.model('Gallery');
const Product = mongoose.model('Product');
const Testimonial = mongoose.model('Testimonial');
const Contact = mongoose.model('Contact');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/admin/login');
};

// Admin dashboard
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const productCount = await Product.countDocuments();
    const galleryCount = await Gallery.countDocuments();
    const testimonialCount = await Testimonial.countDocuments();
    const newMessageCount = await Contact.countDocuments({ status: 'new' });
    
    res.render('admin/dashboard', {
      productCount,
      galleryCount,
      testimonialCount,
      newMessageCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('admin/dashboard', { 
      error: 'Error loading dashboard data',
      productCount: 0,
      galleryCount: 0,
      testimonialCount: 0,
      newMessageCount: 0
    });
  }
});

// Login page
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/admin');
  }
  res.render('admin/login');
});

// Login process
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    
    if (!user || user.password !== password) {
      return res.render('admin/login', { error: 'Invalid username or password' });
    }
    
    req.session.userId = user._id;
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.render('admin/login', { error: 'Login failed' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Products management
router.get('/products', isAuthenticated, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render('admin/products', { products });
  } catch (err) {
    console.error(err);
    res.render('admin/products', { error: 'Failed to load products' });
  }
});

// Add product form
router.get('/products/add', isAuthenticated, (req, res) => {
  res.render('admin/product-form', { product: null });
});

// Add product process
router.post('/products/add', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, featured } = req.body;
    
    if (!req.file) {
      return res.render('admin/product-form', { 
        error: 'Please upload an image',
        product: req.body
      });
    }
    
    const newProduct = new Product({
      name,
      description,
      category,
      imageUrl: `/uploads/${req.file.filename}`,
      featured: featured === 'on' ? true : false
    });
    
    await newProduct.save();
    
    res.redirect('/admin/products?message=Product added successfully');
  } catch (err) {
    console.error(err);
    res.render('admin/product-form', { 
      error: 'Failed to add product',
      product: req.body
    });
  }
});

// Edit product form
router.get('/products/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.redirect('/admin/products?error=Product not found');
    }
    
    res.render('admin/product-form', { product });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/products?error=Failed to load product');
  }
});

// Edit product process
router.post('/products/edit/:id', isAuthenticated, upload.single('image'), async (req, res) => {
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
      // Delete old image if it exists
      if (product.imageUrl) {
        const oldImagePath = path.join(__dirname, '../public', product.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      product.imageUrl = `/uploads/${req.file.filename}`;
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
    
    // Delete image file
    if (product.imageUrl) {
      const imagePath = path.join(__dirname, '../public', product.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
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
    const galleryItems = await Gallery.find().sort({ createdAt: -1 });
    res.render('admin/gallery', { 
      galleryItems,
      message: req.query.message,
      error: req.query.error
    });
  } catch (err) {
    console.error(err);
    res.render('admin/gallery', { error: 'Failed to load gallery items' });
  }
});

// Add gallery item form
router.get('/gallery/add', isAuthenticated, (req, res) => {
  res.render('admin/gallery-form', { 
    item: {},
    formAction: '/admin/gallery/add'
  });
});

// Add gallery item process
router.post('/gallery/add', isAuthenticated, upload.single('image'), async (req, res) => {
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
      imageUrl: `/uploads/${req.file.filename}`
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
    
    res.render('admin/gallery-form', { 
      item,
      formAction: `/admin/gallery/edit/${item._id}`
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/gallery?error=Failed to load gallery item');
  }
});

// Edit gallery item process
router.post('/gallery/edit/:id', isAuthenticated, upload.single('image'), async (req, res) => {
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
      // Delete old image if it exists
      if (item.imageUrl) {
        const oldImagePath = path.join(__dirname, '../public', item.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      item.imageUrl = `/uploads/${req.file.filename}`;
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
    
    // Delete image file
    if (item.imageUrl) {
      const imagePath = path.join(__dirname, '../public', item.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
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
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.render('admin/testimonials', { 
      testimonials,
      message: req.query.message,
      error: req.query.error
    });
  } catch (err) {
    console.error(err);
    res.render('admin/testimonials', { error: 'Failed to load testimonials' });
  }
});

// Add testimonial form
router.get('/testimonials/add', isAuthenticated, (req, res) => {
  res.render('admin/testimonial-form', { 
    testimonial: {},
    formAction: '/admin/testimonials/add'
  });
});

// Add testimonial process
router.post('/testimonials/add', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { name, position, company, content, rating, featured } = req.body;
    
    const newTestimonial = new Testimonial({
      name,
      position,
      company,
      content,
      rating: parseInt(rating) || 5,
      featured: featured === 'on' ? true : false,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : ''
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
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.redirect('/admin/testimonials?error=Testimonial not found');
    }
    
    res.render('admin/testimonial-form', { 
      testimonial,
      formAction: `/admin/testimonials/edit/${testimonial._id}`
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/testimonials?error=Failed to load testimonial');
  }
});

// Edit testimonial process
router.post('/testimonials/edit/:id', isAuthenticated, upload.single('image'), async (req, res) => {
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
      // Delete old image if it exists
      if (testimonial.imageUrl) {
        const oldImagePath = path.join(__dirname, '../public', testimonial.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      testimonial.imageUrl = `/uploads/${req.file.filename}`;
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
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.render('admin/contacts', { 
      contacts,
      message: req.query.message,
      error: req.query.error
    });
  } catch (err) {
    console.error(err);
    res.render('admin/contacts', { error: 'Failed to load contact messages' });
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
    
    res.render('admin/contact-detail', { contact });
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
    // Get settings or create default if not exists
    let settings = await Setting.findOne();
    
    if (!settings) {
      settings = new Setting();
      await settings.save();
    }
    
    res.render('admin/settings', { 
      settings,
      message: req.query.message,
      error: req.query.error
    });
  } catch (err) {
    console.error(err);
    res.render('admin/settings', { 
      error: 'Failed to load settings',
      settings: new Setting()
    });
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
    
    // Get settings
    let settings = await Setting.findOne();
    
    if (!settings) {
      settings = new Setting();
      await settings.save();
    }
    
    const currentImage = settings.heroSlides && settings.heroSlides[slideIndex] 
      ? settings.heroSlides[slideIndex] 
      : null;
    
    res.render('admin/slide-form', { 
      slideIndex,
      currentImage,
      message: req.query.message,
      error: req.query.error
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/settings?error=Failed to load slide editor');
  }
});

// Update slide
router.post('/settings/slide/:index', isAuthenticated, upload.single('image'), async (req, res) => {
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
    
    // Delete old image if it exists
    if (settings.heroSlides[slideIndex]) {
      const oldImagePath = path.join(__dirname, '../public', settings.heroSlides[slideIndex]);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    // Add more logging
    console.log('Settings before update:', settings);
    
    // Update slide image
    settings.heroSlides[slideIndex] = `/uploads/${req.file.filename}`;
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

module.exports = router;
