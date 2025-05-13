const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SettingSchema = new Schema({
  siteName: {
    type: String,
    default: 'Dignity Kitchen'
  },
  siteTagline: {
    type: String,
    default: 'Quality Kitchen Products'
  },
  contactEmail: {
    type: String,
    default: 'contact@dignitykitchen.com'
  },
  contactPhone: {
    type: String,
    default: '+1 (555) 123-4567'
  },
  contactAddress: {
    type: String,
    default: '123 Main Street, City, Country'
  },
  socialFacebook: {
    type: String,
    default: 'https://facebook.com/'
  },
  socialInstagram: {
    type: String,
    default: 'https://instagram.com/'
  },
  socialTwitter: {
    type: String,
    default: 'https://twitter.com/'
  },
  aboutText: {
    type: String,
    default: 'Welcome to Dignity Kitchen, where we provide high-quality kitchen products.'
  },
  footerText: {
    type: String,
    default: '© Dignity Kitchen. All rights reserved.'
  },
  heroSlides: {
    type: [String],
    default: Array(6).fill('')
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', SettingSchema);
