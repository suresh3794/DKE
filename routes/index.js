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

// Export the router
module.exports = router;
