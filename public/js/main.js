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
 * Fetch updated token data via AJAX and update the token list
 */
async function fetchTokens() {
  try {
    const res = await fetch('/api/tokens');
    const tokens = await res.json();

    const container = document.querySelector('.token-list');
    if (!container) return;

    container.innerHTML = ''; // Clear current list

    for (const token of tokens) {
      const div = document.createElement('div');
      div.className = 'token-card';
      div.innerHTML = `
        <div class="token-id">${token.tokenId}</div>
        <div class="token-meta">${token.metadata}</div>
        <div class="token-txid">${token.txid}</div>
        <span class="timestamp" data-timestamp="${token.timestamp}">
          ${new Date(token.timestamp * 1000).toLocaleString()}
        </span>
        <br />
        <a class="details-btn" href="/token/${token.txid}">View</a>
      `;
      container.appendChild(div);
    }

    formatTimestamps();
  } catch (err) {
    console.error('❌ Failed to fetch tokens:', err);
  }
}

/**
 * Set up polling refresh every 15 seconds
 */
function setupAutoRefresh() {
  setInterval(fetchTokens, 15000); // every 15 seconds
}

/**
 * Add "active" class to current nav link
 */
function highlightActiveNav() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (currentPath === href || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });
}

/**
 * Initialize the page
 */
function init() {
  formatTimestamps();
  highlightActiveNav();

  if (document.querySelector('.token-list')) {
    setupAutoRefresh(); // only run on index page
  }
}

document.addEventListener('DOMContentLoaded', init);
