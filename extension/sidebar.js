// ==========================================================
// AI Page Assistant — Sidebar Logic
// Handles page ingestion, streaming queries, chat UI
// =========================================
// API CONFIGURATION
// Swap these when testing locally vs deployed
// =========================================

// const API_BASE = 'http://localhost:8000'; // LOCAL DEVELOPMENT
const API_BASE = 'https://gauravchy09-gc-browser-backend-ai.hf.space'; // PRODUCTION HUGGING FACE URL
let currentUrl    = '';
let currentTitle  = '';
let isIndexed     = false;
let isLoading     = false;
let isStreaming    = false;

// ---- DOM References ----
const messagesArea  = document.getElementById('messagesArea');
const messagesList  = document.getElementById('messagesList');
const welcomeState  = document.getElementById('welcomeState');
const questionInput = document.getElementById('questionInput');
const sendBtn       = document.getElementById('sendBtn');
const statusDot     = document.getElementById('statusDot');
const statusText    = document.getElementById('statusText');
const pageTitleText = document.getElementById('pageTitleText');
const statusBanner  = document.getElementById('statusBanner');
const bannerSpinner = document.getElementById('bannerSpinner');
const selectionNotice = document.getElementById('selectionNotice');
const charCount     = document.getElementById('charCount');
const micBtn        = document.getElementById('micBtn');

// ---- Voice State ----
let recognition = null;
let isListening = false;
let currentUtterance = null;
let voicesLoaded = false;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
  initVoice();
  initPage();
  setupListeners();
});

// ========== VOICE APIs (Native Chrome) ==========
function initVoice() {
  // Speech Recognition (Input)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add('listening');
      questionInput.placeholder = "Listening...";
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      
      if (finalTranscript || interimTranscript) {
        questionInput.value = (finalTranscript || interimTranscript);
        autoResize();
        updateCharCount();
        sendBtn.disabled = false;
      }
    };

    recognition.onerror = (e) => {
      console.error('[Voice] Error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        // Side panels cannot prompt for permission natively. We must open a full tab.
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
        questionInput.value = "Microphone permission required. Please check the new tab.";
      }
      stopListening();
    };

    recognition.onend = () => {
      stopListening();
    };
  } else {
    micBtn.style.display = 'none'; // Browser does not support SpeechRecognition
  }

  // Speech Synthesis (Output)
  if (window.speechSynthesis) {
    
    // Voices might load asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      voicesLoaded = true;
    };
  }
}

function toggleListening() {
  if (!recognition) return;
  if (isListening) stopListening();
  else {
    try {
      window.speechSynthesis.cancel(); // Stop any current speech
      recognition.start();
    } catch (e) {
      console.error("[Voice] recognition.start() failed:", e);
      // If it fails to start, it's often a permission issue in side panel context
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    }
  }
}

function stopListening() {
  if (recognition && isListening) {
    try { recognition.stop(); } catch(e){}
  }
  isListening = false;
  micBtn.classList.remove('listening');
  questionInput.placeholder = "Ask about this page...";
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  document.querySelectorAll('.action-btn.active').forEach(btn => {
    btn.classList.remove('active');
  });
}

function speakText(text, buttonEl) {
  if (!window.speechSynthesis) return;

  // If currently speaking this exact text, stop it
  if (buttonEl.classList.contains('active')) {
    stopSpeaking();
    return;
  }

  stopSpeaking(); // stop anything else

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1.05;

  // Try to use a good-sounding voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Eng')) || voices[0];
  if (preferred) utterance.voice = preferred;

  utterance.onstart = () => buttonEl.classList.add('active');
  utterance.onend = () => buttonEl.classList.remove('active');
  utterance.onerror = () => buttonEl.classList.remove('active');

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}


async function initPage() {
  try {
    const content = await getPageContent();
    if (content) {
      currentUrl   = content.url;
      currentTitle = content.title;
      pageTitleText.textContent = content.title;

      // Show selection notice if user selected text
      if (content.isSelection) {
        selectionNotice.classList.remove('hidden');
      }

      await ingestPage(content.content, content.url, content.title);
    }
  } catch (err) {
    setStatus('error', 'Could not connect to page');
    console.error('[AI Assistant] Init error:', err);
  }
}

// ========== PAGE COMMUNICATION ==========
function getPageContent() {
  return new Promise((resolve, reject) => {
    // currentWindow: true ensures the sidebar correctly targets the window it is attached to
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return reject(new Error('No active tab found'));
      requestContentFromTab(tabs[0], resolve, reject);
    });
  });
}

function requestContentFromTab(tab, resolve, reject) {
  // Prevent running on chrome:// URLs
  if (!tab || !tab.url || tab.url.startsWith('chrome://')) return reject(new Error('Cannot run on internal extensions pages.'));

  try {
    chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTENT' }, (response) => {
      // Safely ignore runtime errors (like "Receiving end does not exist" before scripts inject)
      if (chrome.runtime.lastError) {
        // Content script may not be injected yet
        try {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }, () => {
            // Check for last error from scripting
            if (chrome.runtime.lastError) return reject(new Error('Cannot script this page.'));
            
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { type: 'GET_CONTENT' }, (r) => {
                const _ = chrome.runtime.lastError; // clear error
                if (r) resolve(r);
                else reject(new Error('Could not get page content'));
              });
            }, 300);
          });
        } catch(e) { reject(e); }
      } else {
        resolve(response);
      }
    });
  } catch(e) { reject(e); }
}

// ========== INGESTION ==========
async function ingestPage(content, url, title) {
  setStatus('loading', 'Indexing page...');
  showBanner('Reading and indexing page content...');
  isIndexed  = false;
  sendBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, url, title: title || '' })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ingestion failed');
    }

    const data = await res.json();
    isIndexed = true;

    const cacheMsg = data.cached ? ' (cached)' : '';
    setStatus('ready', `Ready · ${data.chunks} chunks${cacheMsg}`);
    hideBanner();
    sendBtn.disabled = false;

  } catch (err) {
    setStatus('error', 'Backend not running');
    showBanner('⚠ Could not reach backend. Is it running? (Failed to fetch)', true);
    console.error('[AI Assistant] Ingest error:', err);
  }
}

// ========== QUERY (STREAMING) ==========
async function sendQuery(question) {
  if (!question.trim() || isStreaming) return;
  if (!isIndexed) {
    showErrorBubble('Page not indexed yet. Please wait or refresh.');
    return;
  }

  // Hide welcome state on first message
  welcomeState.classList.add('hidden');

  // Show user bubble
  appendMessage('user', question);

  // Clear input and stop reading
  stopSpeaking();
  stopListening();
  questionInput.value = '';
  updateCharCount();
  autoResize();

  // Show typing indicator
  const typingEl = showTypingIndicator();
  isStreaming    = true;
  sendBtn.disabled = true;

  const startTime = Date.now();

  try {
    const res = await fetch(`${API_BASE}/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, url: currentUrl })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Query failed');
    }

    // Remove typing indicator, create streaming bubble
    typingEl.remove();
    const { bubble, messageEl } = appendStreamingMessage();

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';
    let hasContent = false;
    let streamError = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const raw = trimmed.slice(5).trim();
        if (raw === '[DONE]') continue;

        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch (parseErr) {
          console.warn('[AI Assistant] Could not parse SSE chunk:', raw);
          continue;
        }

        if (parsed.token) {
          // Safely append token text
          bubble.insertAdjacentText('beforeend', parsed.token);
          hasContent = true;
          scrollToBottom();
        } else if (parsed.error) {
          // Surface backend / Groq API errors visibly
          streamError = parsed.error;
          console.error('[AI Assistant] Stream error from backend:', parsed.error);
        }
      }
    }

    // Finalize
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    bubble.classList.remove('streaming');

    if (streamError && !hasContent) {
      // No content received AND an error was in the stream — show it
      bubble.textContent = '';
      bubble.classList.add('error-text');
      bubble.innerHTML = `<strong>⚠ Error from AI:</strong> ${streamError}`;
    } else if (!hasContent && !streamError) {
      bubble.textContent = '(No response received — check your GROQ_API_KEY in backend/.env)';
      bubble.classList.add('error-text');
    } else if (hasContent && !streamError) {
      // Add speaker button to final complete successful message
      attachSpeakerButton(messageEl, bubble);
    }
    
    addResponseTime(messageEl, elapsed);

  } catch (err) {
    typingEl?.remove();
    showErrorBubble(`Error: ${err.message}. Make sure the backend is running.`);
    console.error('[AI Assistant] Query error:', err);
  } finally {
    isStreaming = false;
    sendBtn.disabled = false;
    questionInput.focus();
  }
}

// ========== UI HELPERS ==========

function appendMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = `message ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = role === 'user' ? 'You' : 'AI';

  msg.appendChild(bubble);
  msg.appendChild(meta);
  messagesList.appendChild(msg);
  scrollToBottom();
  return msg;
}

function attachSpeakerButton(messageEl, bubbleEl) {
  if (!window.speechSynthesis) return;
  
  const actionsWrap = document.createElement('div');
  actionsWrap.className = 'message-actions';

  const speakBtn = document.createElement('button');
  speakBtn.className = 'action-btn';
  speakBtn.title = 'Listen to answer';
  speakBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>
  `;

  speakBtn.addEventListener('click', () => {
    speakText(bubbleEl.textContent, speakBtn);
  });

  actionsWrap.appendChild(speakBtn);
  messageEl.appendChild(actionsWrap);
}

function appendStreamingMessage() {
  const messageEl = document.createElement('div');
  messageEl.className = 'message assistant';

  const bubble = document.createElement('div');
  bubble.className = 'bubble streaming';

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = 'AI';

  messageEl.appendChild(bubble);
  messageEl.appendChild(meta);
  messagesList.appendChild(messageEl);
  scrollToBottom();

  return { bubble, messageEl };
}

function addResponseTime(messageEl, seconds) {
  const meta = messageEl.querySelector('.message-meta');
  if (meta) {
    const time = document.createElement('span');
    time.className = 'response-time';
    time.textContent = `· ${seconds}s`;
    meta.appendChild(time);
  }
}

function showTypingIndicator() {
  const el = document.createElement('div');
  el.className = 'typing-indicator';
  el.innerHTML = `
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
    <span class="typing-text">Thinking...</span>
  `;
  messagesList.appendChild(el);
  scrollToBottom();
  return el;
}

function showErrorBubble(msg) {
  const el = document.createElement('div');
  el.className = 'error-bubble';
  el.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    ${msg}
  `;
  messagesList.appendChild(el);
  scrollToBottom();
}

function setStatus(state, text) {
  statusDot.className   = `status-dot ${state}`;
  statusText.textContent = text;
}

function showBanner(msg, isError = false) {
  bannerText.textContent = msg;
  bannerSpinner.style.display = isError ? 'none' : 'block';
  statusBanner.classList.remove('hidden');
  if (isError) statusBanner.style.background = 'rgba(248,81,73,0.08)';
  else statusBanner.style.background = '';
}

function hideBanner() {
  statusBanner.classList.add('hidden');
}

function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function updateCharCount() {
  const len = questionInput.value.length;
  charCount.textContent = `${len}/1000`;
  charCount.className = `char-count${len > 800 ? ' warn' : ''}`;
}

function autoResize() {
  questionInput.style.height = 'auto';
  questionInput.style.height = Math.min(questionInput.scrollHeight, 120) + 'px';
}

// ========== EVENT LISTENERS ==========
function setupListeners() {

  // Mic Button
  if (micBtn) {
    micBtn.addEventListener('click', toggleListening);
  }

  // Send on button click
  sendBtn.addEventListener('click', () => {
    sendQuery(questionInput.value.trim());
  });

  // Send on Enter (Shift+Enter = newline)
  questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery(questionInput.value.trim());
    }
  });

  // Auto-resize textarea & char count
  questionInput.addEventListener('input', () => {
    autoResize();
    updateCharCount();
    sendBtn.disabled = questionInput.value.trim().length === 0 || !isIndexed || isStreaming;
  });

  // Quick tip chips
  document.querySelectorAll('.tip-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.question;
      questionInput.value = q;
      updateCharCount();
      autoResize();
      sendQuery(q);
    });
  });

  // Clear conversation
  document.getElementById('clearBtn').addEventListener('click', () => {
    messagesList.innerHTML = '';
    welcomeState.classList.remove('hidden');
  });

  // Re-index page
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    try {
      const content = await getPageContent();
      if (content) {
        await ingestPage(content.content, content.url, content.title);
      }
    } catch (err) {
      showErrorBubble('Could not re-index page.');
    }
  });

  // Helper to re-check the active tab when navigation or tab switches happen
  let checkTimeout = null;
  const triggerCheck = () => {
    clearTimeout(checkTimeout);
    checkTimeout = setTimeout(async () => {
      try {
        const content = await getPageContent();
        // If the URL changed from what we have indexed
        if (content && content.url !== currentUrl) {
          currentUrl = content.url;
          currentTitle = content.title;
          pageTitleText.textContent = content.title;
          isIndexed = false;
          setStatus('loading', 'Loading new page...');
          messagesList.innerHTML = '';
          welcomeState.classList.remove('hidden');
          selectionNotice.classList.add('hidden');
          sendBtn.disabled = true;

          if (content.isSelection) selectionNotice.classList.remove('hidden');
          await ingestPage(content.content, content.url, content.title);
        }
      } catch (_) {}
    }, 500); // 500ms debounce
  };

  // Listen for SPA URL changes directly from content script
  chrome.runtime.onMessage.addListener((message) => {
    // Only accept URL_CHANGED from the content script (we no longer need background PAGE_CHANGED)
    if (message.type === 'URL_CHANGED') {
      triggerCheck();
    }
  });
}
// NOTE: send-button enable logic is already handled in the 'input' listener above (line ~330)
