// Create this file if it doesn't exist
document.addEventListener('DOMContentLoaded', function() {
    // Common admin panel functions
    
    // Function to check if user is authenticated
    window.checkAuth = function() {
        fetch('/admin/check-auth')
            .then(response => {
                if (!response.ok) {
                    window.location.href = '/admin/login';
                }
            })
            .catch(error => {
                console.error('Auth check failed:', error);
                window.location.href = '/admin/login';
            });
    };
    
    // Function to load gallery items
    window.loadGalleryItems = function() {
        // Try multiple endpoints in sequence
        fetch('/api/gallery-items')
            .then(response => {
                if (!response.ok) {
                    // If first endpoint fails, try the second one
                    return fetch('/admin/gallery-items');
                }
                return response;
            })
            .then(response => {
                if (!response.ok) {
                    // If second endpoint fails, try the third one
                    return fetch('/api/admin/gallery-items');
                }
                return response;
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load gallery items');
                }
                return response.json();
            })
            .then(data => {
                if (typeof renderGalleryItems === 'function') {
                    renderGalleryItems(data.galleryItems);
                }
            })
            .catch(error => {
                console.error('Error loading gallery items:', error);
                showMessage('error', 'Failed to load gallery items');
            });
    };
    
    // Function to load products
    window.loadProducts = function() {
        // Use only the endpoint that works
        fetch('/api/products-list')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load products');
                }
                return response.json();
            })
            .then(data => {
                if (typeof renderProducts === 'function') {
                    renderProducts(data.products);
                }
            })
            .catch(error => {
                console.error('Error loading products:', error);
                showMessage('error', 'Failed to load products');
            });
    };
    
    // Function to load testimonials
    window.loadTestimonials = function() {
        // Use only the working endpoint
        fetch('/api/testimonials')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load testimonials');
                }
                return response.json();
            })
            .then(data => {
                if (typeof renderTestimonials === 'function') {
                    renderTestimonials(data.testimonials);
                }
            })
            .catch(error => {
                console.error('Error loading testimonials:', error);
                showMessage('error', 'Failed to load testimonials');
            });
    };
    
    // Function to show messages
    window.showMessage = function(type, message) {
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            messageContainer.innerHTML = `
                <div class="alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
        }
    };
    
    // Function to check for URL parameters
    window.checkMessages = function() {
        const urlParams = new URLSearchParams(window.location.search);
        const errorMsg = urlParams.get('error');
        const successMsg = urlParams.get('message');
        
        if (errorMsg) {
            showMessage('error', decodeURIComponent(errorMsg));
        }
        
        if (successMsg) {
            showMessage('success', decodeURIComponent(successMsg));
        }
    };

    // Function to load contacts
    window.loadContacts = function() {
        // Use only the working endpoint
        fetch('/admin/api/contacts')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load contacts');
                }
                return response.json();
            })
            .then(data => {
                if (typeof renderContacts === 'function') {
                    renderContacts(data.contacts);
                }
            })
            .catch(error => {
                console.error('Error loading contacts:', error);
                showMessage('error', 'Failed to load contact messages');
            });
    };

    // Function to load contact details
    window.loadContactDetails = function(contactId) {
        // Use only the working endpoint
        fetch(`/admin/api/contacts/${contactId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load contact details');
                }
                return response.json();
            })
            .then(data => {
                if (typeof renderContactDetails === 'function') {
                    renderContactDetails(data.contact);
                }
            })
            .catch(error => {
                console.error('Error loading contact details:', error);
                showMessage('error', 'Failed to load contact details');
            });
    };
});
