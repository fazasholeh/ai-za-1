/**
 * ============================================================
 *  FAZA.AI — Main Application Script
 *  Full-featured AI Chat Interface (Anthropic-powered)
 * ============================================================
 */

// ===== CONFIG =====
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const AI_NAME = "Faza.Ai";

// ===== STATE =====
let conversations = JSON.parse(localStorage.getItem("fazaai_conversations") || "[]");
let activeConvId = null;
let settings = JSON.parse(localStorage.getItem("fazaai_settings") || "{}");
let isGenerating = false;
let webSearchEnabled = false;

// Apply saved settings defaults
settings = {
  model: "claude-sonnet-4-20250514",
  language: "id",
  theme: "light",
  personality: "helpful",
  ...settings,
};

// ===== PERSONALITY PROMPTS =====
const PERSONALITY_PROMPTS = {
  helpful: `Kamu adalah ${AI_NAME}, asisten AI yang sangat cerdas, membantu, dan profesional. Berikan jawaban yang akurat, terstruktur, dan bermanfaat. Gunakan format yang mudah dibaca.`,
  friendly: `Kamu adalah ${AI_NAME}, asisten AI yang ramah, santai, dan menyenangkan. Gunakan bahasa yang hangat dan casual. Sesekali gunakan emoji yang relevan.`,
  creative: `Kamu adalah ${AI_NAME}, asisten AI yang sangat kreatif dan imajinatif. Berikan jawaban dengan perspektif yang unik, metafora yang menarik, dan ide-ide inovatif.`,
  concise: `Kamu adalah ${AI_NAME}. Berikan jawaban yang singkat, padat, dan langsung ke poin. Hindari penjelasan panjang kecuali diminta.`,
};

// ===== DOM REFS =====
const chatArea         = document.getElementById("chatArea");
const messagesContainer= document.getElementById("messagesContainer");
const welcomeScreen    = document.getElementById("welcomeScreen");
const messageInput     = document.getElementById("messageInput");
const sendBtn          = document.getElementById("sendBtn");
const charCount        = document.getElementById("charCount");
const chatList         = document.getElementById("chatList");
const newChatBtn       = document.getElementById("newChatBtn");
const clearChatBtn     = document.getElementById("clearChatBtn");
const exportBtn        = document.getElementById("exportBtn");
const settingsBtn      = document.getElementById("settingsBtn");
const settingsModal    = document.getElementById("settingsModal");
const closeSettings    = document.getElementById("closeSettings");
const closeSettings2   = document.getElementById("closeSettings2");
const saveSettingsBtn  = document.getElementById("saveSettings");
const modelSelect      = document.getElementById("modelSelect");
const langSelect       = document.getElementById("langSelect");
const personalitySelect= document.getElementById("personalitySelect");
const toast            = document.getElementById("toast");
const sidebarToggle    = document.getElementById("sidebarToggle");
const mobileSidebarToggle = document.getElementById("mobileSidebarToggle");
const sidebar          = document.getElementById("sidebar");
const webSearchBtn     = document.getElementById("webSearchBtn");
const attachBtn        = document.getElementById("attachBtn");
const voiceBtn         = document.getElementById("voiceBtn");

// ===== INIT =====
function init() {
  applyTheme(settings.theme);
  populateSettingsUI();
  renderChatList();

  if (conversations.length > 0) {
    loadConversation(conversations[0].id);
  }

  // Scroll-to-bottom button
  addScrollToBottomBtn();

  // Check screen size for sidebar
  if (window.innerWidth <= 680) {
    sidebar.classList.remove("open");
  }
}

// ===== THEME =====
function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  document.querySelectorAll(".theme-opt").forEach(b => {
    b.classList.toggle("active", b.dataset.theme === theme);
  });
}

document.querySelectorAll(".theme-opt").forEach(btn => {
  btn.addEventListener("click", () => {
    settings.theme = btn.dataset.theme;
    applyTheme(settings.theme);
  });
});

// ===== SIDEBAR TOGGLE =====
sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

mobileSidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

// Close sidebar on mobile when clicking outside
document.addEventListener("click", (e) => {
  if (window.innerWidth <= 680 &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      e.target !== mobileSidebarToggle) {
    sidebar.classList.remove("open");
  }
});

// ===== SETTINGS =====
function populateSettingsUI() {
  modelSelect.value       = settings.model || "claude-sonnet-4-20250514";
  langSelect.value        = settings.language || "id";
  personalitySelect.value = settings.personality || "helpful";
}

settingsBtn.addEventListener("click", () => {
  populateSettingsUI();
  settingsModal.classList.add("open");
});
closeSettings.addEventListener("click",  () => settingsModal.classList.remove("open"));
closeSettings2.addEventListener("click", () => settingsModal.classList.remove("open"));
settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) settingsModal.classList.remove("open");
});

saveSettingsBtn.addEventListener("click", () => {
  settings.model       = modelSelect.value;
  settings.language    = langSelect.value;
  settings.personality = personalitySelect.value;
  localStorage.setItem("fazaai_settings", JSON.stringify(settings));
  settingsModal.classList.remove("open");
  showToast("✅ Pengaturan disimpan");
});

// ===== WEB SEARCH TOGGLE =====
webSearchBtn.addEventListener("click", () => {
  webSearchEnabled = !webSearchEnabled;
  webSearchBtn.classList.toggle("active", webSearchEnabled);
  showToast(webSearchEnabled ? "🔍 Web search aktif" : "🔍 Web search nonaktif");
});

// ===== FILE ATTACH (UI only) =====
attachBtn.addEventListener("click", () => {
  showToast("📎 Fitur lampiran segera hadir!");
});

// ===== VOICE INPUT =====
voiceBtn.addEventListener("click", () => {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    showToast("🎤 Browser tidak mendukung input suara");
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = settings.language === "en" ? "en-US" : "id-ID";
  recognition.interimResults = false;

  voiceBtn.classList.add("active");
  showToast("🎤 Mendengarkan...");

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    messageInput.value += transcript;
    updateInput();
    voiceBtn.classList.remove("active");
  };
  recognition.onerror = () => {
    voiceBtn.classList.remove("active");
    showToast("🎤 Gagal mendeteksi suara");
  };
  recognition.onend = () => voiceBtn.classList.remove("active");
  recognition.start();
});

// ===== INPUT HANDLING =====
messageInput.addEventListener("input", updateInput);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled && !isGenerating) handleSend();
  }
});

function updateInput() {
  const len = messageInput.value.length;
  charCount.textContent = `${len} / 4000`;
  charCount.style.color = len > 3800 ? "#EF4444" : "var(--slate-300)";
  sendBtn.disabled = len === 0 || isGenerating;

  // Auto-resize textarea
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 180) + "px";
}

sendBtn.addEventListener("click", handleSend);

// ===== SUGGESTION CARDS =====
document.querySelectorAll(".suggestion-card").forEach(card => {
  card.addEventListener("click", () => {
    const prompt = card.dataset.prompt;
    messageInput.value = prompt;
    updateInput();
    handleSend();
  });
});

// ===== NEW CHAT =====
newChatBtn.addEventListener("click", startNewChat);

function startNewChat() {
  activeConvId = null;
  messagesContainer.innerHTML = "";
  welcomeScreen.style.display = "flex";
  messagesContainer.style.display = "none";
  messageInput.value = "";
  updateInput();
  if (window.innerWidth <= 680) sidebar.classList.remove("open");
}

// ===== CLEAR CHAT =====
clearChatBtn.addEventListener("click", () => {
  if (!activeConvId) return;
  if (!confirm("Hapus semua pesan dalam percakapan ini?")) return;
  const conv = getConversation(activeConvId);
  if (conv) {
    conv.messages = [];
    conv.title = "Percakapan Baru";
    saveConversations();
    renderChatList();
    messagesContainer.innerHTML = "";
    welcomeScreen.style.display = "flex";
    messagesContainer.style.display = "none";
  }
});

// ===== EXPORT CHAT =====
exportBtn.addEventListener("click", () => {
  const conv = getConversation(activeConvId);
  if (!conv || conv.messages.length === 0) {
    showToast("❌ Tidak ada chat untuk diekspor");
    return;
  }

  let text = `${AI_NAME} — ${conv.title}\nDiekspor: ${new Date().toLocaleString("id-ID")}\n\n`;
  conv.messages.forEach(m => {
    text += `[${m.role === "user" ? "Anda" : AI_NAME}]\n${m.content}\n\n`;
  });

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `fazaai-chat-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("📥 Chat berhasil diekspor");
});

// ===== SEND MESSAGE =====
async function handleSend() {
  const userText = messageInput.value.trim();
  if (!userText || isGenerating) return;

  // Show chat, hide welcome
  welcomeScreen.style.display = "none";
  messagesContainer.style.display = "flex";

  // Create or get conversation
  if (!activeConvId) {
    const newConv = createConversation(userText);
    activeConvId = newConv.id;
    renderChatList();
  }

  const conv = getConversation(activeConvId);
  if (!conv) return;

  // Add user message
  conv.messages.push({ role: "user", content: userText });
  if (conv.title === "Percakapan Baru") {
    conv.title = userText.slice(0, 42) + (userText.length > 42 ? "…" : "");
    renderChatList();
  }
  saveConversations();

  // Render user message
  appendMessage("user", userText);

  // Clear input
  messageInput.value = "";
  updateInput();

  // Show typing
  const typingEl = appendTypingIndicator();

  isGenerating = true;
  sendBtn.disabled = true;

  try {
    const aiResponse = await callFazaAI(conv.messages);

    // Remove typing
    typingEl.remove();

    // Add AI message
    conv.messages.push({ role: "assistant", content: aiResponse });
    saveConversations();

    // Render AI message
    appendMessage("ai", aiResponse);
    scrollToBottom();

  } catch (err) {
    typingEl.remove();
    const errMsg = `⚠️ Maaf, terjadi kesalahan: ${err.message}. Silakan coba lagi.`;
    appendMessage("ai", errMsg);
    console.error("Faza.Ai API error:", err);
  } finally {
    isGenerating = false;
    sendBtn.disabled = messageInput.value.length === 0;
  }
}

// ===== CALL AI API =====
async function callFazaAI(messages) {
  const systemPrompt = PERSONALITY_PROMPTS[settings.personality] || PERSONALITY_PROMPTS.helpful;

  // Build messages for API (only user/assistant roles)
  const apiMessages = messages.map(m => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: apiMessages,
  };

  if (webSearchEnabled) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();

  // Extract text from content blocks
  const text = (data.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");

  return text || "Maaf, saya tidak bisa memberikan respons saat ini.";
}

// ===== RENDER MESSAGE =====
function appendMessage(role, content) {
  const msgEl = document.createElement("div");
  msgEl.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = `msg-avatar ${role}`;
  avatar.textContent = role === "ai" ? "FA" : "U";

  const bubbleWrapper = document.createElement("div");
  bubbleWrapper.style.display = "flex";
  bubbleWrapper.style.flexDirection = "column";
  bubbleWrapper.style.alignItems = role === "user" ? "flex-end" : "flex-start";
  bubbleWrapper.style.gap = "4px";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  if (role === "ai") {
    bubble.innerHTML = parseMarkdown(content);
    // Add copy buttons to code blocks
    bubble.querySelectorAll("pre").forEach(pre => {
      const btn = document.createElement("button");
      btn.className = "copy-code-btn";
      btn.textContent = "Copy";
      btn.addEventListener("click", () => {
        const code = pre.querySelector("code")?.innerText || pre.innerText;
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = "Copied!";
          setTimeout(() => btn.textContent = "Copy", 2000);
        });
      });
      pre.style.position = "relative";
      pre.appendChild(btn);
    });
  } else {
    bubble.textContent = content;
  }

  const time = document.createElement("div");
  time.className = "msg-time";
  time.textContent = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  // Action buttons (copy, regenerate for AI)
  if (role === "ai") {
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    const copyBtn = makeActionBtn(
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
      "Salin"
    );
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(content).then(() => showToast("✅ Teks disalin"));
    });

    const regenBtn = makeActionBtn(
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
      "Regenerasi"
    );
    regenBtn.addEventListener("click", () => regenerateLastAI());

    const thumbUp = makeActionBtn("👍", "Suka");
    const thumbDown = makeActionBtn("👎", "Tidak suka");
    thumbUp.addEventListener("click", () => showToast("👍 Terima kasih!"));
    thumbDown.addEventListener("click", () => showToast("👎 Masukan diterima!"));

    actions.append(copyBtn, regenBtn, thumbUp, thumbDown);
    bubbleWrapper.append(bubble, time, actions);
  } else {
    bubbleWrapper.append(bubble, time);
  }

  msgEl.append(avatar, bubbleWrapper);
  messagesContainer.appendChild(msgEl);
  scrollToBottom();

  return msgEl;
}

function makeActionBtn(iconOrText, label) {
  const btn = document.createElement("button");
  btn.className = "msg-action-btn";
  btn.innerHTML = iconOrText + ` <span>${label}</span>`;
  return btn;
}

// ===== TYPING INDICATOR =====
function appendTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.className = "message ai";

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar ai";
  avatar.textContent = "FA";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.className = "typing-dot";
    indicator.appendChild(dot);
  }

  bubble.appendChild(indicator);
  wrapper.append(avatar, bubble);
  messagesContainer.appendChild(wrapper);
  scrollToBottom();

  return wrapper;
}

// ===== REGENERATE LAST AI =====
async function regenerateLastAI() {
  if (isGenerating || !activeConvId) return;
  const conv = getConversation(activeConvId);
  if (!conv || conv.messages.length < 2) return;

  // Remove last AI message from history & DOM
  const lastMsgs = messagesContainer.querySelectorAll(".message.ai");
  if (lastMsgs.length > 0) lastMsgs[lastMsgs.length - 1].remove();

  if (conv.messages[conv.messages.length - 1].role === "assistant") {
    conv.messages.pop();
    saveConversations();
  }

  const typingEl = appendTypingIndicator();
  isGenerating = true;
  sendBtn.disabled = true;

  try {
    const aiResponse = await callFazaAI(conv.messages);
    typingEl.remove();
    conv.messages.push({ role: "assistant", content: aiResponse });
    saveConversations();
    appendMessage("ai", aiResponse);
    scrollToBottom();
    showToast("🔄 Respons diperbarui");
  } catch (err) {
    typingEl.remove();
    appendMessage("ai", `⚠️ Gagal meregenerasi: ${err.message}`);
  } finally {
    isGenerating = false;
    sendBtn.disabled = false;
  }
}

// ===== MARKDOWN PARSER (lightweight) =====
function parseMarkdown(text) {
  let html = escapeHtml(text);

  // Code blocks (``` lang ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // Bold **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic *text* or _text_
  html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_\n]+)_/g, "<em>$1</em>");

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr>");

  // Unordered list
  html = html.replace(/^\* (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)(?!\s*<li>)/g, "<ul>$1</ul>");

  // Ordered list
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Line breaks → paragraphs
  html = html
    .split(/\n\n+/)
    .map(para => {
      para = para.trim();
      if (!para) return "";
      if (/^<(h[123]|ul|ol|li|pre|blockquote|hr)/.test(para)) return para;
      return `<p>${para.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ===== CONVERSATION MANAGEMENT =====
function createConversation(firstMessage) {
  const conv = {
    id: "conv_" + Date.now(),
    title: firstMessage.slice(0, 42) + (firstMessage.length > 42 ? "…" : ""),
    messages: [],
    createdAt: Date.now(),
  };
  conversations.unshift(conv);
  saveConversations();
  return conv;
}

function getConversation(id) {
  return conversations.find(c => c.id === id);
}

function saveConversations() {
  localStorage.setItem("fazaai_conversations", JSON.stringify(conversations));
}

function loadConversation(id) {
  activeConvId = id;
  const conv = getConversation(id);
  if (!conv) return;

  messagesContainer.innerHTML = "";

  if (conv.messages.length === 0) {
    welcomeScreen.style.display = "flex";
    messagesContainer.style.display = "none";
  } else {
    welcomeScreen.style.display = "none";
    messagesContainer.style.display = "flex";
    conv.messages.forEach(m => {
      appendMessage(m.role === "user" ? "user" : "ai", m.content);
    });
  }

  renderChatList();
  if (window.innerWidth <= 680) sidebar.classList.remove("open");
}

function renderChatList() {
  chatList.innerHTML = "";

  if (conversations.length === 0) {
    chatList.innerHTML = `<div style="padding:10px 12px;font-size:.78rem;color:var(--slate-400);">Belum ada percakapan</div>`;
    return;
  }

  conversations.forEach(conv => {
    const item = document.createElement("div");
    item.className = "chat-item" + (conv.id === activeConvId ? " active" : "");

    const textEl = document.createElement("div");
    textEl.className = "chat-item-text";
    textEl.textContent = conv.title || "Percakapan";

    const delBtn = document.createElement("button");
    delBtn.className = "chat-item-del btn-icon";
    delBtn.title = "Hapus";
    delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    item.append(textEl, delBtn);
    item.addEventListener("click", () => loadConversation(conv.id));
    chatList.appendChild(item);
  });
}

function deleteConversation(id) {
  conversations = conversations.filter(c => c.id !== id);
  saveConversations();

  if (activeConvId === id) {
    startNewChat();
    activeConvId = null;
  }
  renderChatList();
  showToast("🗑️ Percakapan dihapus");
}

// ===== SCROLL =====
function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

function addScrollToBottomBtn() {
  const btn = document.createElement("button");
  btn.className = "scroll-to-bottom";
  btn.title = "Scroll ke bawah";
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
  document.body.appendChild(btn);

  btn.addEventListener("click", scrollToBottom);

  chatArea.addEventListener("scroll", () => {
    const distFromBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight;
    btn.classList.toggle("visible", distFromBottom > 200);
  });
}

// ===== TOAST =====
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

// ===== START =====
init();
