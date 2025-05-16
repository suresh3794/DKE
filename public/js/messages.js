/**
 * Modern message display system
 * Provides consistent message display across all pages
 */

// Function to show success/error/warning/info messages
function showMessage(type, message, container = 'message-container', autoDismiss = true) {
    // Get the logger if available
    const logger = window.logger || console;
    logger.log(`Showing ${type} message: ${message}`);
    
    const messageContainer = document.getElementById(container);
    if (!messageContainer) {
        logger.error(`Message container #${container} not found`);
        return;
    }
    
    // Determine the icon based on message type
    let icon;
    switch (type) {
        case 'success':
            icon = 'check-circle';
            break;
        case 'error':
            icon = 'exclamation-circle';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            break;
        case 'info':
        default:
            icon = 'info-circle';
            break;
    }
    
    const messageHTML = `
        <div class="message ${type}-message">
            <i class="fas fa-${icon}"></i>
            <div class="message-content">${message}</div>
            <button type="button" class="message-close" aria-label="Close" onclick="dismissMessage(this.parentElement)">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    messageContainer.innerHTML = messageHTML;
    
    // Auto-dismiss after 5 seconds if enabled
    if (autoDismiss) {
        setTimeout(() => {
            const messageElement = messageContainer.querySelector('.message');
            if (messageElement) {
                dismissMessage(messageElement);
            }
        }, 5000);
    }
    
    // Return the message element for further manipulation
    return messageContainer.querySelector('.message');
}

// Function to dismiss a message with animation
function dismissMessage(messageElement) {
    if (!messageElement) return;
    
    messageElement.classList.add('fade-out');
    setTimeout(() => {
        if (messageElement.parentElement) {
            messageElement.parentElement.removeChild(messageElement);
        }
    }, 500);
}

// Function to check URL parameters for messages
function checkUrlMessages() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const error = urlParams.get('error');
    const warning = urlParams.get('warning');
    const info = urlParams.get('info');
    
    if (message) {
        showMessage('success', decodeURIComponent(message));
    }
    
    if (error) {
        showMessage('error', decodeURIComponent(error));
    }
    
    if (warning) {
        showMessage('warning', decodeURIComponent(warning));
    }
    
    if (info) {
        showMessage('info', decodeURIComponent(info));
    }
}

// Auto-check for URL messages when the script loads
document.addEventListener('DOMContentLoaded', checkUrlMessages);