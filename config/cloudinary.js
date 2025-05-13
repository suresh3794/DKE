const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create storage engine for general uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dignity-kitchen',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ quality: 'auto:good' }]
  }
});

// Create storage engine for hero slides
const heroSlideStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dignity-kitchen/hero-slides',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1920, height: 800, crop: 'fill', quality: 'auto:good' }]
  }
});

// Create storage engine for gallery
const galleryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dignity-kitchen/gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto:good' }]
  }
});

// Create storage engine for products
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dignity-kitchen/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto:good' }]
  }
});

// Create storage engine for testimonials
const testimonialStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dignity-kitchen/testimonials',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto:good' }]
  }
});

// Create multer instances
const upload = multer({ storage: storage });
const heroSlideUpload = multer({ storage: heroSlideStorage });
const galleryUpload = multer({ storage: galleryStorage });
const productUpload = multer({ storage: productStorage });
const testimonialUpload = multer({ storage: testimonialStorage });

// Helper function to delete image from Cloudinary
const deleteImage = async (publicId) => {
  if (!publicId) return;
  
  try {
    // Extract public ID from URL if needed
    let id = publicId;
    if (publicId.includes('cloudinary.com')) {
      // Extract the public ID from the URL
      const parts = publicId.split('/');
      const filename = parts[parts.length - 1];
      const folderPath = parts.slice(parts.indexOf('dignity-kitchen')).join('/');
      id = folderPath.split('.')[0]; // Remove file extension
    }
    
    await cloudinary.uploader.destroy(id);
    console.log(`Deleted image: ${id}`);
  } catch (error) {
    console.error(`Error deleting image from Cloudinary: ${error.message}`);
  }
};

module.exports = {
  cloudinary,
  upload,
  heroSlideUpload,
  galleryUpload,
  productUpload,
  testimonialUpload,
  deleteImage
};