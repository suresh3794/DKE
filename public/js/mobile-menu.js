// Mobile menu functionality - improved version
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mobile menu script loaded');
    
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const menu = document.querySelector('.menu');
    
    if (!menuBtn || !menu) {
        console.error('Mobile menu elements not found');
        return;
    }
    
    console.log('Mobile menu elements found');
    
    // Toggle menu when hamburger is clicked
    menuBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Menu button clicked');
        
        // Force display block first to ensure transition works
        if (!menu.classList.contains('active')) {
            menu.style.display = 'flex';
        }
        
        // Toggle active class
        menu.classList.toggle('active');
        console.log('Menu active:', menu.classList.contains('active'));
        
        // Change icon based on menu state
        const icon = this.querySelector('i');
        if (icon) {
            if (menu.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
                console.log('Icon changed to X');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
                console.log('Icon changed to bars');
                
                // Hide menu after transition
                setTimeout(() => {
                    if (!menu.classList.contains('active')) {
                        menu.style.display = '';
                    }
                }, 300);
            }
        }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (menu.classList.contains('active') && 
            !menu.contains(event.target) && 
            !menuBtn.contains(event.target)) {
            
            menu.classList.remove('active');
            console.log('Menu closed by outside click');
            
            const icon = menuBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
            
            // Hide menu after transition
            setTimeout(() => {
                if (!menu.classList.contains('active')) {
                    menu.style.display = '';
                }
            }, 300);
        }
    });
    
    // Log the current menu state for debugging
    console.log('Initial menu display:', window.getComputedStyle(menu).display);
    console.log('Initial menu visibility:', window.getComputedStyle(menu).visibility);
});
