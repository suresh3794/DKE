document.addEventListener('DOMContentLoaded', function() {
    // Basic form validation
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            
            // Basic validation
            if (!name || !email || !subject || !message) {
                e.preventDefault();
                alert('Please fill in all required fields');
                return false;
            }
            
            // Form is valid, let it submit normally
            return true;
        });
    }
});
