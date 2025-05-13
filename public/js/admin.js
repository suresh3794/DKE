Greatdocument.addEventListener('DOMContentLoaded', function() {
    // Auto-hide success messages after 5 seconds
    const successMessages = document.querySelectorAll('.success-message');
    if (successMessages.length > 0) {
        setTimeout(() => {
            successMessages.forEach(message => {
                message.style.opacity = '0';
                setTimeout(() => {
                    message.style.display = 'none';
                }, 500);
            });
        }, 5000);
    }
    
    // Mobile menu toggle
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', function() {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.toggle('active');
        });
    }
    
    // File input styling
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const fileName = this.files[0]?.name;
            const label = this.previousElementSibling;
            if (fileName) {
                if (label.querySelector('span')) {
                    label.querySelector('span').textContent = fileName;
                } else {
                    const span = document.createElement('span');
                    span.textContent = fileName;
                    span.style.marginLeft = '10px';
                    span.style.fontWeight = 'normal';
                    label.appendChild(span);
                }
            }
        });
    });
});