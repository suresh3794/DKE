const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');

// Products page
router.get('/products', async (req, res) => {
  try {
    // Instead of rendering a template, send the HTML file
    res.sendFile(path.join(__dirname, '../public/products.html'));
  } catch (err) {
    console.error(err);
    res.status(500).sendFile(path.join(__dirname, '../public/error.html'));
  }
});

// Product detail page
router.get('/products/:id', async (req, res) => {
  try {
    // Instead of rendering a template, send the HTML file
    // You'll need to handle the product ID on the client side
    res.sendFile(path.join(__dirname, '../public/product-detail.html'));
  } catch (err) {
    console.error(err);
    res.status(500).sendFile(path.join(__dirname, '../public/error.html'));
  }
});

// Update your home route to serve the HTML file
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// About page - update to serve HTML file
router.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/about.html'));
});

// Gallery page
router.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/gallery.html'));
});

// Contact page
router.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/contact.html'));
});

// Contact form submission
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    // Use appLogger instead of console.log
    const appLogger = req.app.locals.appLogger || console;
    appLogger.log('Contact form submission received:', { name, email, phone, subject, message });
    
    // Validate required fields
    if (!name || !email || !subject || !message) {
      appLogger.log('Missing required fields in contact form submission');
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
      status: 'new'
    });
    
    appLogger.log('Attempting to save contact:', newContact);
    await newContact.save();
    appLogger.log('Contact saved successfully');
    
    // Redirect to success page
    res.redirect('/contact/success');
  } catch (err) {
    const appLogger = req.app.locals.appLogger || console;
    appLogger.error('Contact form error:', err);
    res.redirect('/contact?error=Failed to send your message. Please try again.');
  }
});

// Contact success page
router.get('/contact/success', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/contact-success.html'));
});

// Export the router
module.exports = router;
