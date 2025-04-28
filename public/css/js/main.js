// public/js/main.js

/**
 * Auto-refresh the token list every minute
 */
function setupAutoRefresh() {
    setTimeout(() => {
      window.location.reload();
    }, 60000); // 1 minute
  }
  
  /**
   * Format timestamps to local date/time
   */
  function formatTimestamps() {
    const timestamps = document.querySelectorAll('.timestamp');
    timestamps.forEach(element => {
      const timestamp = parseInt(element.getAttribute('data-timestamp'), 10);
      if (!isNaN(timestamp)) {
        element.textContent = new Date(timestamp * 1000).toLocaleString();
      }
    });
  }
  
  /**
   * Initialize the page
   */
  function init() {
    // Format timestamps
    formatTimestamps();
    
    // Set up auto-refresh on index page
    if (document.querySelector('.token-list')) {
      setupAutoRefresh();
    }
    
    // Add active class to current nav link
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (currentPath === href || 
          (href !== '/' && currentPath.startsWith(href))) {
        link.classList.add('active');
      }
    });
  }
  
  // Run initialization when DOM is loaded
  document.addEventListener('DOMContentLoaded', init);