const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary - will use CLOUDINARY_URL if present, or individual credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Replace the verbose logging with a more concise version
console.log("Cloudinary configuration:", 
  Object.entries({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  }).reduce((status, [key, value]) => {
    status[key] = value ? "✓" : "✗";
    return status;
  }, {})
);

// Create storage engines for different upload types
const galleryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif']
  }
});

const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});

const testimonialStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'testimonials',
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});

const heroSlideStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'hero-slides',
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});

// Create multer upload instances
const galleryUpload = multer({ storage: galleryStorage });
const productUpload = multer({ storage: productStorage });
const testimonialUpload = multer({ storage: testimonialStorage });
const heroSlideUpload = multer({ storage: heroSlideStorage });

// Function to delete images from Cloudinary
const deleteImage = async (publicId) => {
  try {
    if (!publicId) return { success: false, message: 'No public ID provided' };
    
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: result.result === 'ok', message: result.result };
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return { success: false, message: error.message };
  }
};

// Function to get default user image URL
const getDefaultUserImage = () => {
  return "https://res.cloudinary.com/dsdqwqupu/image/upload/v1747397756/307ce493-b254-4b2d-8ba4-d12c080d6651_npbwez.jpg";
};

module.exports = {
  cloudinary,
  galleryUpload,
  productUpload,
  testimonialUpload,
  heroSlideUpload,
  deleteImage,
  getDefaultUserImage
};
