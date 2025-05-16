const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');

const Gallery = mongoose.model('Gallery');
const Product = mongoose.model('Product');
const Testimonial = mongoose.model('Testimonial');
const Contact = mongoose.model('Contact');

// Home page
router.get('/', async (req, res) => {
  try {
    // Get featured products for homepage
    const featuredProducts = await Product.find({ featured: true }).limit(6);
    
    // Get featured testimonials for homepage
    const featuredTestimonials = await Testimonial.find({ featured: true }).limit(3);
    
    res.render('index', { 
      featuredProducts,
      featuredTestimonials,
      title: 'Home',
      page: 'home'
    });
  } catch (err) {
    console.error(err);
    res.render('index', { 
      featuredProducts: [],
      featuredTestimonials: [],
      title: 'Home',
      page: 'home'
    });
  }
});

// About page - update to serve HTML file
router.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/about.html'));
});

// Gallery page
router.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/gallery.html'));
});

// API endpoint for gallery items
router.get('/api/gallery', async (req, res) => {
  try {
    const galleryItems = await Gallery.find().sort({ createdAt: -1 });
    res.json(galleryItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load gallery items' });
  }
});

// Products page
router.get('/products', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/products.html'));
});

// Product detail page
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render('error', { message: 'Product not found' });
    }
    
    // Get related products from the same category
    const relatedProducts = await Product.find({ 
      category: product.category,
      _id: { $ne: product._id }
    }).limit(3);
    
    res.render('product-detail', { product, relatedProducts });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Failed to load product' });
  }
});

// Contact page
router.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/contact.html'));
});

// Contact form submission
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message, product } = req.body;
    
    // Log the received data for debugging
    console.log('Contact form submission received:', { name, email, phone, subject, message, product });
    
    // Validate required fields
    if (!name || !email || !subject || !message) {
      console.log('Missing required fields in contact form submission');
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
    
    console.log('Attempting to save contact:', newContact);
    await newContact.save();
    console.log('Contact saved successfully');
    
    // Redirect to success page
    res.redirect('/contact/success');
  } catch (err) {
    console.error('Contact form error:', err);
    res.redirect('/contact?error=Failed to send your message. Please try again.');
  }
});

// Contact success page
router.get('/contact/success', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/contact-success.html'));
});



module.exports = router;
