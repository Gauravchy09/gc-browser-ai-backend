// =========================================
// INJECTED WIDGET LOGIC
// Injects the FAB button and iframe into the host page
// =========================================

function injectBotWidget() {
  // Check if already injected
  if (document.getElementById('ai-rag-widget-container')) return;

  // 1. Create Wrapper
  const container = document.createElement('div');
  container.id = 'ai-rag-widget-container';

  // 2. Create Iframe Wrapper
  const iframeWrapper = document.createElement('div');
  iframeWrapper.id = 'ai-rag-iframe-wrapper';

  // 3. Create Iframe referencing our extension UI
  const iframe = document.createElement('iframe');
  iframe.id = 'ai-rag-iframe';
  // Use extension URL for sidebar.html
  iframe.src = chrome.runtime.getURL('sidebar.html');
  iframe.allow = "microphone"; // Explicitly allow microphone access through the iframe

  iframeWrapper.appendChild(iframe);

  // 4. Create Floating Action Button (FAB)
  const fab = document.createElement('button');
  fab.id = 'ai-rag-fab';
  fab.title = 'Open AI Assistant';

  // Add GC text and Close Icon
  fab.innerHTML = `
    <!-- GC Text Label -->
    <span class="ai-rag-text-gc">GC</span>
    <!-- Close Icon -->
    <svg class="ai-rag-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  // Toggle logic
  const toggleWidget = () => {
    const isOpen = iframeWrapper.classList.contains('ai-rag-open');
    if (isOpen) {
      iframeWrapper.classList.remove('ai-rag-open');
      fab.classList.remove('ai-rag-open');
    } else {
      iframeWrapper.classList.add('ai-rag-open');
      fab.classList.add('ai-rag-open');
    }
  };

  fab.addEventListener('click', toggleWidget);

  // Allow toggling from the browser extension action button
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'TOGGLE_WIDGET') toggleWidget();
  });

  // 5. Append everything to DOM
  container.appendChild(iframeWrapper);
  container.appendChild(fab);
  document.body.appendChild(container);
}

// Ensure the page is ready before injecting
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectBotWidget);
} else {
  injectBotWidget();
}
