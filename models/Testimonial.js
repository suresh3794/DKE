const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TestimonialSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  company: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5
  },
  imageUrl: {
    type: String,
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

module.exports = mongoose.model('Testimonial', TestimonialSchema);
