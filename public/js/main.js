// If there's any form handling code in main.js, add this condition
document.addEventListener('DOMContentLoaded', function() {
  // Skip automatic form handling for contact form
  const isContactPage = window.location.pathname.includes('/contact');
  if (isContactPage) {
    console.log('Contact page detected - skipping automatic form handling');
    // You might need to add specific code here to prevent automatic form handling
  }
  
  // Note: Mobile menu is now handled in mobile-menu.js
  
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

/**
 * Loads a component (header, footer, etc.) into the specified target element
 * and properly executes any scripts contained within the component.
 * 
 * @param {string} component - The name of the component to load (e.g., 'header', 'footer')
 * @param {string} targetId - The ID of the element to load the component into
 * @param {Object} data - Additional data to pass to the component
 */
function loadComponent(component, targetId, data = {}) {
    console.log(`Loading component: ${component}`);
    fetch(`/components/${component}.html`)
        .then(response => response.text())
        .then(html => {
            // Insert the HTML
            document.getElementById(targetId).innerHTML = html;
            
            // Find and execute scripts
            const scripts = document.getElementById(targetId).getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                const script = scripts[i];
                const scriptClone = document.createElement('script');
                
                // Copy attributes
                for (let j = 0; j < script.attributes.length; j++) {
                    const attr = script.attributes[j];
                    scriptClone.setAttribute(attr.name, attr.value);
                }
                
                // Copy content
                scriptClone.textContent = script.textContent;
                
                // Replace the original script with the clone to execute it
                script.parentNode.replaceChild(scriptClone, script);
            }
            
            if (component === 'header') {
                // Initialize any header-specific JS
                highlightCurrentPage(data.page);
            }
            
            console.log(`Component loaded and scripts executed: ${component}`);
        })
        .catch(error => console.error(`Error loading ${component}:`, error));
}

/**
 * Highlights the current page in the navigation menu
 * 
 * @param {string} page - The current page identifier
 */
function highlightCurrentPage(page) {
    const menuItems = document.querySelectorAll('.menu li a');
    menuItems.forEach(item => {
        const href = item.getAttribute('href');
        if ((href === '/' && page === 'home') ||
            (href === '/about' && page === 'about') ||
            (href === '/products' && page === 'products') ||
            (href === '/gallery' && page === 'gallery') ||
            (href === '/contact' && page === 'contact')) {
            item.parentElement.classList.add('active');
        }
    });
}
