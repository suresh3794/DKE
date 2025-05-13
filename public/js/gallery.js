document.addEventListener('DOMContentLoaded', function() {
    // Gallery filtering
    const filterButtons = document.querySelectorAll('.filter-btn:not(.sub-filter)');
    const subFilterButtons = document.querySelectorAll('.filter-btn.sub-filter');
    const galleryItems = document.querySelectorAll('.gallery-item');
    const productSubfilters = document.querySelector('.product-subfilters');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            const filterValue = this.getAttribute('data-filter');
            
            // Show/hide product subcategories
            if (filterValue === 'products') {
                productSubfilters.style.display = 'flex';
            } else {
                productSubfilters.style.display = 'none';
                // Reset sub-filters
                subFilterButtons.forEach(btn => btn.classList.remove('active'));
            }
            
            galleryItems.forEach(item => {
                if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    });
    
    // Product subcategory filtering
    subFilterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all sub-filter buttons
            subFilterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            const subFilterValue = this.getAttribute('data-filter');
            
            galleryItems.forEach(item => {
                if (item.getAttribute('data-category') === 'products') {
                    if (subFilterValue === 'all' || item.getAttribute('data-product-category') === subFilterValue) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                }
            });
        });
    });
    
    // Lightbox functionality
    const galleryImages = document.querySelectorAll('.gallery-item img');
    const body = document.body;
    
    galleryImages.forEach(image => {
        image.addEventListener('click', function() {
            const lightbox = document.createElement('div');
            lightbox.className = 'lightbox';
            
            const lightboxContent = document.createElement('div');
            lightboxContent.className = 'lightbox-content';
            
            const fullImage = document.createElement('img');
            fullImage.src = this.src;
            
            const closeBtn = document.createElement('span');
            closeBtn.className = 'lightbox-close';
            closeBtn.innerHTML = '&times;';
            
            closeBtn.addEventListener('click', function() {
                lightbox.remove();
                body.classList.remove('no-scroll');
            });
            
            lightbox.addEventListener('click', function(e) {
                if (e.target === lightbox) {
                    lightbox.remove();
                    body.classList.remove('no-scroll');
                }
            });
            
            lightboxContent.appendChild(fullImage);
            lightboxContent.appendChild(closeBtn);
            lightbox.appendChild(lightboxContent);
            body.appendChild(lightbox);
            body.classList.add('no-scroll');
        });
    });
});
