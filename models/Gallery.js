const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GallerySchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  imageUrl: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['installations', 'products', 'events'],
    default: 'installations'
  },
  productCategory: {
    type: String,
    enum: ['cooking', 'refrigeration', 'preparation', 'storage', ''],
    default: ''
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Gallery', GallerySchema);
