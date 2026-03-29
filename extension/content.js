// ==========================================================
// AI Page Assistant - Content Script
// Runs on every page: extracts clean text, monitors URL changes
// ==========================================================

/**
 * Remove noisy elements and extract meaningful text from the page
 */
function getCleanPageContent() {
  const bodyClone = document.body.cloneNode(true);

  const noiseSelectors = [
    'script', 'style', 'noscript', 'svg', 'canvas', 'img',
    'nav', 'header', 'footer', 'aside',
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
    '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
    '[class*="overlay"]', '[class*="banner"]',
    '[class*="ad-"]', '[class*="-ad"]', '[class*="advertisement"]',
    '[id*="cookie"]', '[id*="popup"]', '[id*="modal"]',
    '[id*="banner"]', '[id*="ad"]',
    '[class*="newsletter"]', '[class*="subscribe"]',
    '[class*="social-share"]', '[class*="share-bar"]',
    'iframe', 'video', 'audio',
    '.advertisement', '.ad', '.ads', '#ad', '#ads',
    '.related-posts', '.comments', '#comments'
  ];

  noiseSelectors.forEach(sel => {
    try {
      bodyClone.querySelectorAll(sel).forEach(el => el.remove());
    } catch (_) {}
  });

  const raw = bodyClone.innerText || bodyClone.textContent || '';

  // Normalize whitespace
  return raw
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
}

/**
 * Get currently selected text - caches it because selecting the sidebar loses window focus
 */
let lastKnownSelection = '';

document.addEventListener('selectionchange', () => {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    lastKnownSelection = selection;
  }
});

function getSelectedText() {
  const current = window.getSelection().toString().trim();
  // Return current if any, otherwise fallback to our cached string
  return current || lastKnownSelection;
}

// ---- URL Change Detection (for SPAs) ----
let lastUrl = location.href;

const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    chrome.runtime.sendMessage({
      type: 'URL_CHANGED',
      url: location.href,
      title: document.title
    }).catch(() => {});
  }
});

urlObserver.observe(document, { subtree: true, childList: true });

// ---- Message Listener ----
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_CONTENT') {
    const selected = getSelectedText();
    // Use selected text if it's more than a few characters
    const isSelection = selected.length > 10;
    const content = isSelection ? selected : getCleanPageContent();

    sendResponse({
      content,
      url: location.href,
      title: document.title,
      isSelection,
      charCount: content.length
    });
    // Do NOT return true unless we send asynchronous responses
  } else if (request.type === 'PING') {
    sendResponse({ status: 'alive' });
  }
});
