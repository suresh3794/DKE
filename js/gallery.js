document.addEventListener('DOMContentLoaded', function() {
    // Gallery filtering
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            const filterValue = this.getAttribute('data-filter');
            
            galleryItems.forEach(item => {
                if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
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
            
            const caption = document.createElement('div');
            caption.className = 'lightbox-caption';
            const galleryItem = this.closest('.gallery-item');
            const title = galleryItem.querySelector('h3').textContent;
            const description = galleryItem.querySelector('p').textContent;
            caption.innerHTML = `<h3>${title}</h3><p>${description}</p>`;
            
            lightboxContent.appendChild(fullImage);
            lightboxContent.appendChild(caption);
            lightbox.appendChild(lightboxContent);
            lightbox.appendChild(closeBtn);
            body.appendChild(lightbox);
            
            // Add active class after a small delay to trigger transition
            setTimeout(() => {
                lightbox.classList.add('active');
            }, 10);
            
            // Close lightbox when clicking on close button or outside the image
            closeBtn.addEventListener('click', closeLightbox);
            lightbox.addEventListener('click', function(e) {
                if (e.target === lightbox) {
                    closeLightbox();
                }
            });
            
            // Close lightbox with Escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeLightbox();
                }
            });
            
            function closeLightbox() {
                lightbox.classList.remove('active');
                setTimeout(() => {
                    body.removeChild(lightbox);
                }, 300);
            }
        });
    });
    
    // Animation on scroll
    const animateOnScroll = function() {
        const galleryItems = document.querySelectorAll('.gallery-item:not(.hidden)');
        
        galleryItems.forEach((item, index) => {
            const itemPosition = item.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.2;
            
            if (itemPosition < screenPosition) {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    };
    
    // Set initial state for animation
    galleryItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    // Run animation on load and scroll
    window.addEventListener('load', animateOnScroll);
    window.addEventListener('scroll', animateOnScroll);
});