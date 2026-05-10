/**
 * ============================================
 * FAZA.AI — Full-Featured Chat Application
 * script.js
 * ============================================
 */

// ============ STATE ============
const state = {
  conversations: JSON.parse(localStorage.getItem('faza_conversations') || '[]'),
  currentConvId: null,
  isLoading: false,
  settings: JSON.parse(localStorage.getItem('faza_settings') || JSON.stringify({
    theme: 'light',
    fontSize: 'md',
    lang: 'id',
    streaming: true,
    serverUrl: 'http://localhost:5000'
  })),
  attachedFiles: [],
  isRecording: false,
  recognition: null,
  selectedModel: 'v2.5',
};

// ============ DOM REFERENCES ============
const $ = id => document.getElementById(id);
const chatArea = $('chatArea');
const chatHistory = $('chatHistory');
const messagesContainer = $('messagesContainer');
const welcomeScreen = $('welcomeScreen');
const messageInput = $('messageInput');
const sendBtn = $('sendBtn');
const charCounter = $('charCounter');
const newChatBtn = $('newChatBtn');
const modelSelector = $('modelSelector');
const modelDropdown = $('modelDropdown');
const menuBtn = $('menuBtn');
const sidebar = $('sidebar');
const sidebarOverlay = $('sidebarOverlay');
const settingsBtn = $('settingsBtn');
const settingsModal = $('settingsModal');
const closeSettings = $('closeSettings');
const saveSettings = $('saveSettings');
const clearHistoryBtn = $('clearHistoryBtn');
const attachBtn = $('attachBtn');
const fileInput = $('fileInput');
const attachmentPreview = $('attachmentPreview');
const voiceBtn = $('voiceBtn');
const themeBtn = $('themeBtn');
const shareBtn = $('shareBtn');
const toast = $('toast');
const searchChats = $('searchChats');

// ============ INIT ============
function init() {
  applySettings();
  renderChatHistory();

  if (state.conversations.length === 0) {
    createNewConversation();
  } else {
    loadConversation(state.conversations[0].id);
  }

  bindEvents();
  initVoice();
}

// ============ SETTINGS ============
function applySettings() {
  const { theme, fontSize } = state.settings;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-font', fontSize);
  $('themeSelect').value = theme;
  $('fontSizeSelect').value = fontSize;
  $('langSelect').value = state.settings.lang;
  $('streamToggle').checked = state.settings.streaming;
  $('serverUrl').value = state.settings.serverUrl;
}

function saveSettingsHandler() {
  state.settings.theme = $('themeSelect').value;
  state.settings.fontSize = $('fontSizeSelect').value;
  state.settings.lang = $('langSelect').value;
  state.settings.streaming = $('streamToggle').checked;
  state.settings.serverUrl = $('serverUrl').value;
  localStorage.setItem('faza_settings', JSON.stringify(state.settings));
  applySettings();
  settingsModal.style.display = 'none';
  showToast('Pengaturan disimpan ✓');
}

// ============ CONVERSATIONS ============
function createNewConversation() {
  const id = 'conv_' + Date.now();
  const conv = {
    id,
    title: 'Percakapan Baru',
    messages: [],
    createdAt: Date.now(),
    model: state.selectedModel,
  };
  state.conversations.unshift(conv);
  saveConversations();
  loadConversation(id);
  return conv;
}

function loadConversation(id) {
  state.currentConvId = id;
  const conv = getConversation(id);
  messagesContainer.innerHTML = '';

  if (conv.messages.length === 0) {
    welcomeScreen.style.display = 'flex';
    messagesContainer.style.display = 'none';
  } else {
    welcomeScreen.style.display = 'none';
    messagesContainer.style.display = 'flex';
    conv.messages.forEach(msg => renderMessage(msg, false));
    scrollToBottom();
  }

  renderChatHistory();
}

function getConversation(id) {
  return state.conversations.find(c => c.id === id);
}

function saveConversations() {
  localStorage.setItem('faza_conversations', JSON.stringify(state.conversations));
}

function deleteConversation(id) {
  state.conversations = state.conversations.filter(c => c.id !== id);
  saveConversations();
  if (state.currentConvId === id) {
    if (state.conversations.length > 0) {
      loadConversation(state.conversations[0].id);
    } else {
      createNewConversation();
    }
  } else {
    renderChatHistory();
  }
}

// ============ RENDER CHAT HISTORY SIDEBAR ============
function renderChatHistory(filter = '') {
  chatHistory.innerHTML = '';
  const filtered = state.conversations.filter(c =>
    c.title.toLowerCase().includes(filter.toLowerCase())
  );

  filtered.forEach(conv => {
    const item = document.createElement('div');
    item.className = 'chat-item' + (conv.id === state.currentConvId ? ' active' : '');
    item.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="chat-item-text">${escapeHtml(conv.title)}</span>
      <button class="chat-delete-btn" data-id="${conv.id}" title="Hapus">×</button>
    `;
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('chat-delete-btn')) return;
      loadConversation(conv.id);
      if (window.innerWidth <= 900) closeSidebar();
    });
    chatHistory.appendChild(item);
  });

  // Delete buttons
  chatHistory.querySelectorAll('.chat-delete-btn').forEach(btn => {
    btn.style.cssText = `
      margin-left: auto; background: none; border: none;
      color: var(--text-muted); cursor: pointer; font-size: 1.1rem;
      padding: 0 4px; border-radius: 4px; opacity: 0;
      transition: 0.2s;
    `;
    btn.parentElement.addEventListener('mouseenter', () => btn.style.opacity = '1');
    btn.parentElement.addEventListener('mouseleave', () => btn.style.opacity = '0');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Hapus percakapan ini?')) deleteConversation(btn.dataset.id);
    });
  });
}

// ============ MESSAGES ============
function renderMessage(msg, animate = true) {
  const div = document.createElement('div');
  div.className = `message ${msg.role}`;
  div.dataset.id = msg.id;
  if (!animate) div.style.animation = 'none';

  const time = new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const avatarContent = msg.role === 'user' ? 'U' : '✦';
  const senderName = msg.role === 'user' ? 'Anda' : 'Faza.AI';

  div.innerHTML = `
    <div class="msg-avatar">${avatarContent}</div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-sender">${senderName}</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="msg-bubble" id="bubble_${msg.id}">${formatMessage(msg.content)}</div>
      <div class="msg-actions">
        ${msg.role === 'ai' ? `
          <button class="msg-action-btn" onclick="copyMessage('${msg.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Salin
          </button>
          <button class="msg-action-btn" onclick="regenerateMessage('${msg.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            Ulangi
          </button>
        ` : `
          <button class="msg-action-btn" onclick="copyMessage('${msg.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Salin
          </button>
        `}
        <button class="msg-action-btn" onclick="deleteMessage('${msg.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
          Hapus
        </button>
      </div>
    </div>
  `;

  messagesContainer.appendChild(div);
  return div;
}

function formatMessage(content) {
  if (!content) return '';
  let html = escapeHtml(content);

  // Code blocks with syntax highlighting
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || 'text';
    return `<div style="margin:10px 0;border-radius:10px;overflow:hidden;background:#0a1628;">
      <div class="code-header">
        <span>${language}</span>
        <button class="copy-code-btn" onclick="copyCode(this)">Salin Kode</button>
      </div>
      <pre style="margin:0;border-radius:0 0 10px 10px;"><code>${code.trim()}</code></pre>
    </div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Unordered list
  html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);

  // Ordered list
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, '');

  return html;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ============ SEND MESSAGE ============
async function sendMessage(userText = null) {
  if (state.isLoading) return;

  const text = userText || messageInput.value.trim();
  if (!text && state.attachedFiles.length === 0) return;

  const conv = getConversation(state.currentConvId);
  if (!conv) return;

  // Show chat area
  welcomeScreen.style.display = 'none';
  messagesContainer.style.display = 'flex';

  // Add user message
  const userMsg = {
    id: 'msg_' + Date.now(),
    role: 'user',
    content: text,
    timestamp: Date.now(),
    files: state.attachedFiles.map(f => f.name),
  };
  conv.messages.push(userMsg);

  // Update title
  if (conv.messages.length === 1 && text) {
    conv.title = text.slice(0, 40) + (text.length > 40 ? '…' : '');
  }

  renderMessage(userMsg);
  messageInput.value = '';
  charCounter.textContent = '0';
  autoResize();
  sendBtn.disabled = true;
  clearAttachments();
  scrollToBottom();

  // Typing indicator
  const typingEl = createTypingIndicator();
  state.isLoading = true;

  try {
    // Build messages array for API
    const apiMessages = conv.messages.slice(-20).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    let aiResponse = '';

    if (state.settings.streaming) {
      aiResponse = await streamResponse(apiMessages, typingEl, conv);
    } else {
      aiResponse = await fetchResponse(apiMessages);
    }

    // Remove typing indicator
    typingEl.remove();

    // Add AI message
    const aiMsg = {
      id: 'msg_' + Date.now(),
      role: 'ai',
      content: aiResponse,
      timestamp: Date.now(),
    };
    conv.messages.push(aiMsg);
    saveConversations();
    renderChatHistory();

    if (!state.settings.streaming) {
      renderMessage(aiMsg);
      scrollToBottom();
    }

  } catch (error) {
    typingEl.remove();
    const errMsg = {
      id: 'msg_' + Date.now(),
      role: 'ai',
      content: `❌ **Terjadi kesalahan:** ${error.message}\n\nPastikan server Python sudah berjalan di \`${state.settings.serverUrl}\` atau periksa koneksi internet Anda.`,
      timestamp: Date.now(),
    };
    conv.messages.push(errMsg);
    renderMessage(errMsg);
    scrollToBottom();
  }

  state.isLoading = false;
  saveConversations();
}

async function fetchResponse(messages) {
  const systemPrompt = getSystemPrompt();
  const res = await fetch(`${state.settings.serverUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      system: systemPrompt,
      model: state.selectedModel,
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const data = await res.json();
  return data.response || data.content || 'Tidak ada respons.';
}

async function streamResponse(messages, typingEl, conv) {
  const systemPrompt = getSystemPrompt();

  // Try server streaming
  try {
    const res = await fetch(`${state.settings.serverUrl}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        system: systemPrompt,
        model: state.selectedModel,
        stream: true,
      }),
    });

    if (!res.ok) throw new Error('Stream error');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    // Create streaming bubble
    typingEl.remove();
    const streamMsg = {
      id: 'msg_stream_' + Date.now(),
      role: 'ai',
      content: '',
      timestamp: Date.now(),
    };
    const msgEl = renderMessage(streamMsg);
    const bubble = msgEl.querySelector('.msg-bubble');
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const token = parsed.token || parsed.content || '';
            fullText += token;
            bubble.innerHTML = formatMessage(fullText) + '<span class="streaming-cursor"></span>';
            scrollToBottom();
          } catch {}
        }
      }
    }

    bubble.innerHTML = formatMessage(fullText);
    return fullText;

  } catch {
    // Fallback: simulate streaming with Anthropic API via script.js proxy
    typingEl.remove();
    return await simulateStreamWithAPI(messages, conv);
  }
}

async function simulateStreamWithAPI(messages, conv) {
  // Use Anthropic API directly from browser as fallback
  const systemPrompt = getSystemPrompt();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.slice(-10),
    }),
  });

  if (!response.ok) {
    throw new Error('API tidak tersedia. Jalankan server Python lokal.');
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || 'Tidak ada respons.';

  // Simulate streaming
  const streamMsg = {
    id: 'msg_stream_' + Date.now(),
    role: 'ai',
    content: '',
    timestamp: Date.now(),
  };
  const msgEl = renderMessage(streamMsg);
  const bubble = msgEl.querySelector('.msg-bubble');

  let displayed = '';
  const words = content.split(' ');
  for (let i = 0; i < words.length; i++) {
    displayed += (i > 0 ? ' ' : '') + words[i];
    bubble.innerHTML = formatMessage(displayed) + '<span class="streaming-cursor"></span>';
    scrollToBottom();
    await delay(20 + Math.random() * 30);
  }

  bubble.innerHTML = formatMessage(content);
  return content;
}

function getSystemPrompt() {
  const lang = state.settings.lang;
  const langInstruction = lang === 'id'
    ? 'Selalu jawab dalam Bahasa Indonesia kecuali user menggunakan bahasa lain.'
    : 'Always respond in English unless the user uses another language.';

  return `Kamu adalah Faza.AI, asisten kecerdasan buatan generasi berikutnya yang cerdas, membantu, dan ramah. 
Kamu dibuat oleh tim Faza untuk membantu pengguna dengan berbagai tugas: coding, analisis, penulisan, matematika, riset, dan percakapan umum.

${langInstruction}

Karakteristik kamu:
- Cerdas dan akurat dalam memberikan informasi
- Ramah dan berempati
- Proaktif dalam memberikan penjelasan tambahan yang berguna
- Mampu memformat respons dengan markdown (bold, italic, kode, daftar, dll)
- Jujur ketika tidak mengetahui sesuatu

Model saat ini: Faza Model ${state.selectedModel}
Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
}

function createTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message ai';
  wrapper.innerHTML = `
    <div class="msg-avatar">✦</div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-sender">Faza.AI</span>
        <span class="msg-time">Sedang mengetik...</span>
      </div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

// ============ MESSAGE ACTIONS ============
function copyMessage(id) {
  const conv = getConversation(state.currentConvId);
  const msg = conv?.messages.find(m => m.id === id);
  if (msg) {
    navigator.clipboard.writeText(msg.content).then(() => showToast('Pesan disalin ✓'));
  }
}

function copyCode(btn) {
  const code = btn.closest('[style]').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Tersalin!';
    setTimeout(() => btn.textContent = 'Salin Kode', 2000);
  });
}

function deleteMessage(id) {
  const conv = getConversation(state.currentConvId);
  if (!conv) return;
  conv.messages = conv.messages.filter(m => m.id !== id);
  saveConversations();
  const el = messagesContainer.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'scale(0.95)';
    setTimeout(() => el.remove(), 300);
  }
  if (conv.messages.length === 0) {
    welcomeScreen.style.display = 'flex';
    messagesContainer.style.display = 'none';
  }
}

function regenerateMessage(id) {
  const conv = getConversation(state.currentConvId);
  if (!conv) return;
  const idx = conv.messages.findIndex(m => m.id === id);
  if (idx === -1) return;

  // Remove this AI message and everything after
  conv.messages = conv.messages.slice(0, idx);
  saveConversations();

  // Re-render
  messagesContainer.innerHTML = '';
  conv.messages.forEach(msg => renderMessage(msg, false));

  // Get last user message and resend
  const lastUser = [...conv.messages].reverse().find(m => m.role === 'user');
  if (lastUser) {
    conv.messages = conv.messages.slice(0, conv.messages.indexOf(lastUser) + 1);
    renderMessage({ ...lastUser }, false);

    // Trigger AI response
    const apiMessages = conv.messages.slice(-20).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));
    state.isLoading = true;
    const typingEl = createTypingIndicator();
    streamResponse(apiMessages, typingEl, conv).then(response => {
      typingEl.remove();
      const aiMsg = { id: 'msg_' + Date.now(), role: 'ai', content: response, timestamp: Date.now() };
      conv.messages.push(aiMsg);
      saveConversations();
      renderMessage(aiMsg);
      scrollToBottom();
      state.isLoading = false;
    }).catch(() => { state.isLoading = false; });
  }
}

// ============ AUTO-RESIZE TEXTAREA ============
function autoResize() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
}

// ============ ATTACHMENTS ============
function handleFileAttach(files) {
  Array.from(files).forEach(file => {
    if (state.attachedFiles.length >= 5) { showToast('Maksimal 5 file'); return; }
    state.attachedFiles.push(file);
  });
  renderAttachments();
}

function renderAttachments() {
  if (state.attachedFiles.length === 0) {
    attachmentPreview.style.display = 'none';
    return;
  }
  attachmentPreview.style.display = 'flex';
  attachmentPreview.innerHTML = state.attachedFiles.map((f, i) => `
    <div class="attachment-chip">
      📎 ${f.name.slice(0, 20)}${f.name.length > 20 ? '…' : ''}
      <span class="attachment-remove" onclick="removeAttachment(${i})">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </span>
    </div>
  `).join('');
}

function removeAttachment(idx) {
  state.attachedFiles.splice(idx, 1);
  renderAttachments();
}

function clearAttachments() {
  state.attachedFiles = [];
  renderAttachments();
  fileInput.value = '';
}

// ============ VOICE INPUT ============
function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { voiceBtn.style.opacity = '0.4'; voiceBtn.title = 'Browser tidak mendukung'; return; }

  state.recognition = new SpeechRecognition();
  state.recognition.lang = 'id-ID';
  state.recognition.continuous = false;
  state.recognition.interimResults = true;

  state.recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    messageInput.value = transcript;
    autoResize();
    updateSendBtn();
    charCounter.textContent = transcript.length;
  };

  state.recognition.onend = () => {
    state.isRecording = false;
    voiceBtn.classList.remove('active');
  };

  state.recognition.onerror = () => {
    state.isRecording = false;
    voiceBtn.classList.remove('active');
    showToast('Gagal merekam suara');
  };
}

function toggleVoice() {
  if (!state.recognition) { showToast('Perekaman suara tidak didukung'); return; }
  if (state.isRecording) {
    state.recognition.stop();
  } else {
    state.recognition.start();
    state.isRecording = true;
    voiceBtn.classList.add('active');
    showToast('🎤 Sedang mendengarkan...');
  }
}

// ============ TOAST ============
let toastTimeout;
function showToast(msg, duration = 2500) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), duration);
}

// ============ UTILITY ============
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateSendBtn() {
  const hasText = messageInput.value.trim().length > 0;
  const hasFiles = state.attachedFiles.length > 0;
  sendBtn.disabled = !hasText && !hasFiles;
}

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}

// ============ EXPORT CHAT ============
function exportChat() {
  const conv = getConversation(state.currentConvId);
  if (!conv || conv.messages.length === 0) { showToast('Tidak ada percakapan untuk diekspor'); return; }

  let text = `FAZA.AI — Export Percakapan\n`;
  text += `Judul: ${conv.title}\n`;
  text += `Tanggal: ${new Date(conv.createdAt).toLocaleString('id-ID')}\n`;
  text += '='.repeat(50) + '\n\n';

  conv.messages.forEach(msg => {
    const time = new Date(msg.timestamp).toLocaleTimeString('id-ID');
    const role = msg.role === 'user' ? 'Anda' : 'Faza.AI';
    text += `[${time}] ${role}:\n${msg.content}\n\n`;
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `faza-ai-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Chat berhasil diekspor ✓');
}

// ============ BIND EVENTS ============
function bindEvents() {
  // Send
  sendBtn.addEventListener('click', () => sendMessage());

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  messageInput.addEventListener('input', () => {
    autoResize();
    updateSendBtn();
    charCounter.textContent = messageInput.value.length;
  });

  // New Chat
  newChatBtn.addEventListener('click', () => {
    createNewConversation();
    if (window.innerWidth <= 900) closeSidebar();
  });

  // Model Selector
  modelSelector.addEventListener('click', (e) => {
    e.stopPropagation();
    modelDropdown.classList.toggle('open');
  });

  modelDropdown.querySelectorAll('.model-option').forEach(opt => {
    opt.addEventListener('click', () => {
      state.selectedModel = opt.dataset.model;
      modelSelector.querySelector('span').textContent = opt.querySelector('.model-name').textContent;
      modelDropdown.querySelectorAll('.model-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      modelDropdown.classList.remove('open');
      showToast(`Model diganti ke ${opt.querySelector('.model-name').textContent}`);
    });
  });

  document.addEventListener('click', () => modelDropdown.classList.remove('open'));

  // Mobile menu
  menuBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  sidebarOverlay.addEventListener('click', closeSidebar);

  // Settings
  settingsBtn.addEventListener('click', () => { settingsModal.style.display = 'flex'; });
  closeSettings.addEventListener('click', () => { settingsModal.style.display = 'none'; });
  settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.style.display = 'none'; });
  saveSettings.addEventListener('click', saveSettingsHandler);
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Hapus semua riwayat percakapan?')) {
      state.conversations = [];
      saveConversations();
      settingsModal.style.display = 'none';
      createNewConversation();
      showToast('Riwayat dihapus');
    }
  });

  // File attachment
  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFileAttach(e.target.files));

  // Drag & drop
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFileAttach(e.dataTransfer.files);
  });

  // Voice
  voiceBtn.addEventListener('click', toggleVoice);

  // Theme toggle
  themeBtn.addEventListener('click', () => {
    state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('faza_settings', JSON.stringify(state.settings));
    applySettings();
    showToast(`Tema ${state.settings.theme === 'dark' ? 'gelap' : 'terang'} aktif`);
  });

  // Share / Export
  shareBtn.addEventListener('click', exportChat);

  // Suggestion cards
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.suggestion-card');
    if (card) {
      const prompt = card.dataset.prompt;
      messageInput.value = prompt;
      autoResize();
      updateSendBtn();
      charCounter.textContent = prompt.length;
      messageInput.focus();
      sendMessage(prompt);
    }
  });

  // Search chats
  searchChats.addEventListener('input', (e) => renderChatHistory(e.target.value));

  // Paste files
  messageInput.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') handleFileAttach([item.getAsFile()]);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      createNewConversation();
    }
    if (e.key === 'Escape') {
      settingsModal.style.display = 'none';
      closeSidebar();
    }
  });
}

// ============ START ============
document.addEventListener('DOMContentLoaded', init);

// Expose functions used in HTML
window.copyMessage = copyMessage;
window.copyCode = copyCode;
window.deleteMessage = deleteMessage;
window.regenerateMessage = regenerateMessage;
window.removeAttachment = removeAttachment;
