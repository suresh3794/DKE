// Add this at the top of your main.js file
console.log('main.js loaded');

// If there's any form handling code in main.js, add this condition
document.addEventListener('DOMContentLoaded', function() {
  // Skip automatic form handling for contact form
  const isContactPage = window.location.pathname.includes('/contact');
  if (isContactPage) {
    console.log('Contact page detected - skipping automatic form handling');
    // You might need to add specific code here to prevent automatic form handling
  }
  
  // Mobile menu toggle
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const menu = document.querySelector('.menu');
  
  if (menuBtn && menu) {
      menuBtn.addEventListener('click', function() {
          menu.classList.toggle('active');
      });
  }
  
  // Slider functionality for homepage
  const slides = document.querySelectorAll('.slide');
  const indicators = document.querySelectorAll('.indicator');
  let currentSlide = 0;
  
  function showSlide(n) {
      // Check if slides exist before trying to access them
      if (!slides || slides.length === 0) return;
      
      // Reset current slide
      slides.forEach(slide => {
          if (slide && slide.classList) {
              slide.classList.remove('active');
          }
      });
      
      // Reset current indicator
      if (indicators && indicators.length > 0) {
          indicators.forEach(indicator => {
              if (indicator && indicator.classList) {
                  indicator.classList.remove('active');
              }
          });
      }
      
      // Set new current slide
      if (n >= slides.length) currentSlide = 0;
      if (n < 0) currentSlide = slides.length - 1;
      
      // Activate current slide and indicator
      if (slides[currentSlide] && slides[currentSlide].classList) {
          slides[currentSlide].classList.add('active');
      }
      
      if (indicators && indicators.length > currentSlide && indicators[currentSlide] && indicators[currentSlide].classList) {
          indicators[currentSlide].classList.add('active');
      }
  }
  
  // Auto slide change
  if (slides && slides.length > 0) {
      setInterval(function() {
          currentSlide++;
          showSlide(currentSlide);
      }, 5000);
  }
  
  // Initialize first slide
  showSlide(currentSlide);
  
  // Indicator click handlers
  if (indicators && indicators.length > 0) {
      indicators.forEach((indicator, index) => {
          if (indicator) {
              indicator.addEventListener('click', function() {
                  currentSlide = index;
                  showSlide(currentSlide);
              });
          }
      });
  }
});
