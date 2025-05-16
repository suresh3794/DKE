// Simple test server to diagnose routing issues
const express = require('express');
const app = express();

// API Test endpoint
app.get('/api-test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Dashboard stats endpoint
app.get('/dashboard-stats', (req, res) => {
  res.json({
    productCount: 5,
    galleryCount: 10,
    testimonialCount: 3,
    newMessageCount: 2
  });
});

// Serve static files
app.use(express.static('public'));

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});