/* ── Landing page ───────────────────────── */
const landingPage = document.getElementById("landing-page");
const navCta = document.getElementById("lp-nav-cta");

function enterApp() {
  landingPage.classList.add("lp-exit");
  setTimeout(() => {
    landingPage.classList.add("lp-hidden");
    navCta.textContent = "";
    navCta.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to Home';
    navCta.classList.remove("lp-cta-trigger");
    navCta.classList.add("lp-nav-back");
  }, 580);
}

document.querySelectorAll(".lp-cta-trigger:not(#lp-nav-cta)").forEach(btn => {
  btn.addEventListener("click", enterApp);
});

navCta.addEventListener("click", () => {
  if (navCta.classList.contains("lp-nav-back")) {
    landingPage.classList.remove("lp-hidden");
    requestAnimationFrame(() => landingPage.classList.remove("lp-exit"));
    navCta.classList.remove("lp-nav-back");
    navCta.classList.add("lp-cta-trigger");
    navCta.innerHTML = "Get Started Free";
  } else {
    enterApp();
  }
});

/* ── Scrollytelling Engine ──────────────── */
(function () {
  const lp = document.getElementById("landing-page");
  if (!lp) return;

  /* Progress bar */
  const bar = document.getElementById("lp-progress-bar");
  function updateProgress() {
    const pct = lp.scrollTop / (lp.scrollHeight - lp.clientHeight);
    bar.style.transform = "scaleX(" + Math.min(pct, 1) + ")";
  }

  /* Parallax */
  const beam   = document.getElementById("lp-beam");
  const glowEl = document.getElementById("lp-glow");
  function doParallax(sy) {
    if (beam)   beam.style.transform   = "translateX(-50%) translateY(" + (sy * 0.38) + "px)";
    if (glowEl) glowEl.style.transform = "translateX(-50%) translateY(" + (sy * 0.18) + "px)";
  }

  lp.addEventListener("scroll", () => {
    updateProgress();
    doParallax(lp.scrollTop);
  }, { passive: true });

  /* Cursor spotlight */
  const cursor = document.getElementById("lp-cursor-glow");
  lp.addEventListener("mousemove", e => {
    cursor.style.left = e.clientX + "px";
    cursor.style.top  = e.clientY + "px";
  }, { passive: true });

  /* Tag elements for reveal */
  const singles = [
    [".lp-badge",        0],
    [".lp-title",        100],
    [".lp-sub",          200],
    [".lp-hero-actions", 320],
    [".lp-preview-wrap", 460],
    [".lp-stats-inner",  0],
    [".lp-final-title",  0],
    [".lp-final-sub",    120],
    [".lp-final-inner .lp-cta", 240],
    [".lp-final-inner .lp-footnote", 340],
  ];
  singles.forEach(([sel, delay]) => {
    const el = lp.querySelector(sel);
    if (!el) return;
    el.dataset.reveal = "";
    if (delay) el.style.transitionDelay = delay + "ms";
  });

  /* Stagger repeated children */
  [
    ".lp-section-eyebrow",
    ".lp-section-title",
    ".lp-steps .lp-step",
    ".lp-features .lp-feature-card",
    ".lp-testimonials .lp-testimonial",
  ].forEach(sel => {
    lp.querySelectorAll(sel).forEach((el, i) => {
      el.dataset.reveal = "";
      const base = sel.includes("eyebrow") ? 0 : sel.includes("title") ? 80 : 0;
      el.style.transitionDelay = (base + i * 90) + "ms";
    });
  });

  /* Intersection Observer — add data-revealed to trigger CSS */
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.dataset.revealed = "";
      io.unobserve(entry.target);
    });
  }, { root: lp, rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

  lp.querySelectorAll("[data-reveal]").forEach(el => io.observe(el));

  /* Animated number counters for stat nums */
  const counterIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const raw = el.textContent.trim();
      const num = parseFloat(raw);
      if (isNaN(num)) return;
      const suffix = raw.slice(String(num).length);
      let t0 = null;
      const dur = 1600;
      const tick = ts => {
        if (!t0) t0 = ts;
        const p    = Math.min((ts - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const val  = num < 10 ? Math.round(ease * num * 10) / 10 : Math.round(ease * num);
        el.textContent = val + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = raw;
      };
      requestAnimationFrame(tick);
      counterIO.unobserve(el);
    });
  }, { root: lp, threshold: 0.6 });

  lp.querySelectorAll(".lp-stat-num").forEach(el => counterIO.observe(el));

  /* Immediately reveal elements already in viewport on load */
  requestAnimationFrame(() => {
    const lpRect = lp.getBoundingClientRect();
    lp.querySelectorAll("[data-reveal]").forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < lpRect.bottom) el.dataset.revealed = "";
    });
  });
})();

/* ── State ─────────────────────────────── */
let sessionId = null;
let chatHistory = [];
let isGenerating = false;
let resumeText = "";
const CHAT_STORAGE_KEY = "careerlens_conversations";
let conversations = loadConversations();
let activeConversationId = null;

/* ── DOM refs ───────────────────────────── */
const uploadZone   = document.getElementById("upload-zone");
const fileInput    = document.getElementById("file-input");
const scoreSection = document.getElementById("score-section");
const actionsLabel = document.getElementById("actions-label");
const actionBtns   = document.getElementById("action-buttons");
const ringFill     = document.getElementById("ring-fill");
const scoreNumber  = document.getElementById("score-number");
const resumeName   = document.getElementById("resume-name");
const skillsList   = document.getElementById("skills-list");
const feedbackList = document.getElementById("feedback-list");
const messagesEl   = document.getElementById("messages");
const typingEl     = document.getElementById("typing-indicator");
const welcomeEl    = document.getElementById("welcome-screen");
const chatInput    = document.getElementById("chat-input");
const sendBtn      = document.getElementById("send-btn");

const btnImprove       = document.getElementById("btn-improve");
const improveInputWrap = document.getElementById("improve-input-wrap");
const targetRoleInput  = document.getElementById("target-role-input");
const btnGenImprove    = document.getElementById("btn-generate-improve");
const btnCover         = document.getElementById("btn-cover");
const fabToggle        = document.getElementById("fab-toggle");
const sidebar          = document.getElementById("sidebar");
const sidebarOverlay   = document.getElementById("sidebar-overlay");
const newChatBtn       = document.getElementById("new-chat-btn");
const chatHistoryList  = document.getElementById("chat-history-list");

function loadConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (err) {
    return [];
  }
}

function saveConversations() {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations.slice(-30)));
}

function makeConversation() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: "New conversation",
    messages: [],
    sessionId: null,
    updatedAt: Date.now(),
  };
}

function getActiveConversation() {
  return conversations.find(conversation => conversation.id === activeConversationId);
}

function persistActiveConversation() {
  const conversation = getActiveConversation();
  if (!conversation) return;
  conversation.messages = chatHistory.slice();
  conversation.sessionId = sessionId;
  conversation.updatedAt = Date.now();
  saveConversations();
  renderConversationList();
}

function renderConversationList() {
  chatHistoryList.innerHTML = "";
  const recent = conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  if (!recent.length) {
    chatHistoryList.innerHTML = '<div class="chat-history-empty">No saved conversations</div>';
    return;
  }
  recent.forEach(conversation => {
    const button = document.createElement("button");
    button.className = `chat-history-item${conversation.id === activeConversationId ? " active" : ""}`;
    button.textContent = conversation.title;
    button.title = conversation.title;
    button.addEventListener("click", () => openConversation(conversation.id));
    chatHistoryList.appendChild(button);
  });
}

function startNewChat() {
  if (isGenerating) return;
  const conversation = makeConversation();
  conversations.push(conversation);
  activeConversationId = conversation.id;
  sessionId = null;
  chatHistory = [];
  messagesEl.innerHTML = "";
  welcomeEl.style.display = "flex";
  chatInput.value = "";
  improveInputWrap.style.display = "none";
  saveConversations();
  renderConversationList();
  chatInput.focus();
}

function openConversation(id) {
  if (isGenerating) return;
  const conversation = conversations.find(item => item.id === id);
  if (!conversation) return;
  activeConversationId = id;
  sessionId = conversation.sessionId || null;
  chatHistory = conversation.messages.slice();
  messagesEl.innerHTML = "";
  welcomeEl.style.display = chatHistory.length ? "none" : "flex";
  chatHistory.forEach(message => {
    if (message.role === "user") appendUserMessage(message.content, false);
    if (message.role === "assistant") appendAIMessage(message.content, false);
  });
  renderConversationList();
  closeSidebar();
}

newChatBtn.addEventListener("click", startNewChat);
if (conversations.length) {
  const latest = conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0];
  openConversation(latest.id);
} else {
  startNewChat();
}

/* ═══════════════════════════════════════════════
   UPLOAD
   ═══════════════════════════════════════════════ */
uploadZone.addEventListener("click", () => fileInput.click());

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("dragover"));
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

async function handleFile(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showToast("Only PDF files are supported.", "error");
    return;
  }
  setUploadLoading(true);
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res = await fetch("/upload-resume", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");
    sessionId = data.session_id;
    resumeText = "";
    const conversation = getActiveConversation();
    if (conversation) conversation.sessionId = sessionId;
    displayAnalysis(data, file.name);
    showToast("Resume uploaded and analysed!", "success");
    const analysisMessage =
      `Your resume has been analysed! Here's what I found:\n\n` +
      `**Score: ${data.score}/100**\n\n` +
      (data.feedback || []).map(f => `• ${f}`).join("\n") +
      `\n\nI'm ready to help you land your dream role. What would you like to work on first?`;
    chatHistory.push({ role: "assistant", content: analysisMessage });
    appendAIMessage(analysisMessage);
    persistActiveConversation();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setUploadLoading(false);
  }
}

function setUploadLoading(on) {
  if (on) {
    uploadZone.classList.add("uploading");
    document.getElementById("upload-title").textContent = "Analysing resume...";
  } else {
    uploadZone.classList.remove("uploading");
    document.getElementById("upload-title").textContent = "Upload Resume";
  }
}

function displayAnalysis(data, filename) {
  // Score ring
  const circumference = 251.2;
  const offset = circumference - (data.score / 100) * circumference;
  ringFill.style.strokeDashoffset = offset;
  const color = data.score >= 70 ? "#10b981" : data.score >= 40 ? "#f59e0b" : "#f43f5e";
  ringFill.style.stroke = color;

  // Animate counter
  animateCounter(scoreNumber, 0, data.score, 1200);

  resumeName.textContent = filename;

  // Score verdict
  const verdictEl = document.getElementById("score-verdict");
  if (verdictEl) {
    verdictEl.textContent = data.score >= 70 ? "Strong Resume" : data.score >= 40 ? "Needs Work" : "Needs Major Work";
  }

  // Skills
  skillsList.innerHTML = "";
  (data.skills_found || []).slice(0, 12).forEach(skill => {
    const badge = document.createElement("span");
    badge.className = "skill-tag";
    badge.textContent = skill;
    skillsList.appendChild(badge);
  });

  // Feedback
  feedbackList.innerHTML = "";
  (data.feedback || []).forEach(fb => {
    const item = document.createElement("div");
    item.className = "feedback-item";
    item.textContent = fb;
    feedbackList.appendChild(item);
  });

  scoreSection.style.display = "block";
  actionsLabel.style.display = "block";
  actionBtns.style.display = "flex";
}

function animateCounter(el, from, to, duration) {
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ═══════════════════════════════════════════════
   CHAT
   ═══════════════════════════════════════════════ */
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + "px";
});

sendBtn.addEventListener("click", sendMessage);

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || isGenerating) return;

  hideWelcome();
  appendUserMessage(text);
  chatInput.value = "";
  chatInput.style.height = "auto";

  const userMsg = { role: "user", content: text };
  chatHistory.push(userMsg);
  const conversation = getActiveConversation();
  if (conversation && conversation.title === "New conversation") {
    conversation.title = text.slice(0, 42) + (text.length > 42 ? "..." : "");
  }
  persistActiveConversation();

  setGenerating(true);
  showTyping();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId || "",
        message: text,
        history: chatHistory.slice(-10),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Chat failed");
    hideTyping();
    appendAIMessage(data.reply);
    chatHistory.push({ role: "assistant", content: data.reply });
    persistActiveConversation();
  } catch (err) {
    hideTyping();
    const errorMessage = `Sorry, something went wrong: ${err.message}`;
    appendAIMessage(errorMessage);
    chatHistory.push({ role: "assistant", content: errorMessage });
    persistActiveConversation();
  } finally {
    setGenerating(false);
  }
}

function sendChip(text) {
  chatInput.value = text;
  sendMessage();
}

function setGenerating(on) {
  isGenerating = on;
  sendBtn.disabled = on;
}

function hideWelcome() {
  if (welcomeEl) welcomeEl.style.display = "none";
}

function showTyping() {
  typingEl.style.display = "flex";
  scrollToBottom();
}
function hideTyping() {
  typingEl.style.display = "none";
}

function appendUserMessage(text, shouldScroll = true) {
  const div = document.createElement("div");
  div.className = "message user";
  div.innerHTML = `
    <div class="msg-avatar user-avatar">You</div>
    <div class="message-bubble">${escHtml(text)}</div>
  `;
  messagesEl.appendChild(div);
  if (shouldScroll) scrollToBottom();
}

function appendAIMessage(markdown, shouldScroll = true) {
  const div = document.createElement("div");
  div.className = "message ai";
  div.innerHTML = `
    <div class="msg-avatar ai-avatar">AI</div>
    <div class="message-bubble">${marked.parse(markdown)}</div>
  `;
  messagesEl.appendChild(div);
  if (shouldScroll) scrollToBottom();
}

function scrollToBottom() {
  const container = document.querySelector(".chat-container");
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

/* ═══════════════════════════════════════════════
   IMPROVE RESUME
   ═══════════════════════════════════════════════ */
btnImprove.addEventListener("click", () => {
  const open = improveInputWrap.style.display !== "none";
  improveInputWrap.style.display = open ? "none" : "flex";
  if (!open) targetRoleInput.focus();
});

btnGenImprove.addEventListener("click", triggerImprove);
targetRoleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") triggerImprove();
});

async function triggerImprove() {
  if (!sessionId) {
    showToast("Please upload your resume first.", "error");
    return;
  }
  const role = targetRoleInput.value.trim();
  if (!role) {
    showToast("Please enter a target role.", "error");
    return;
  }

  btnGenImprove.disabled = true;
  btnGenImprove.innerHTML = `<span class="spinner"></span>AI is rewriting...`;

  try {
    const res = await fetch("/improve-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, target_role: role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed");

    document.getElementById("original-resume-preview").textContent = data.original;
    document.getElementById("improved-resume-output").innerHTML = marked.parse(data.improved);
    openModal("modal-improve");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btnGenImprove.disabled = false;
    btnGenImprove.textContent = "Generate";
  }
}

/* ═══════════════════════════════════════════════
   COVER LETTER
   ═══════════════════════════════════════════════ */
btnCover.addEventListener("click", () => {
  if (!sessionId) {
    showToast("Please upload your resume first.", "error");
    return;
  }
  showCoverForm();
  openModal("modal-cover");
});

function showCoverForm() {
  document.getElementById("cover-form-view").style.display = "block";
  document.getElementById("cover-result-view").style.display = "none";
}

async function generateCoverLetter() {
  const company = document.getElementById("company-name-input").value.trim();
  const jobDesc = document.getElementById("job-desc-input").value.trim();
  if (!company) { showToast("Please enter a company name.", "error"); return; }
  if (!jobDesc) { showToast("Please paste the job description.", "error"); return; }

  const btn = document.getElementById("btn-gen-cover");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span>Generating...`;

  try {
    const res = await fetch("/generate-cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        company_name: company,
        job_description: jobDesc,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed");

    document.getElementById("cover-letter-output").innerHTML = marked.parse(data.cover_letter);
    document.getElementById("cover-form-view").style.display = "none";
    document.getElementById("cover-result-view").style.display = "flex";
    document.getElementById("cover-result-view").style.flexDirection = "column";
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate Cover Letter";
  }
}

/* ═══════════════════════════════════════════════
   MODAL HELPERS
   ═══════════════════════════════════════════════ */
function openModal(id) {
  const el = document.getElementById(id);
  el.style.display = "flex";
  document.body.style.overflow = "hidden";
  el.querySelector(".modal").classList.remove("slide-down");
  void el.querySelector(".modal").offsetWidth;
  el.querySelector(".modal").classList.add("slide-down");
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
  document.body.style.overflow = "";
}

// Close modal on backdrop click
document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal(backdrop.id);
  });
});

/* ═══════════════════════════════════════════════
   COPY / DOWNLOAD
   ═══════════════════════════════════════════════ */
async function copyContent(elId, btnId) {
  const el = document.getElementById(elId);
  const text = el.innerText || el.textContent;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!", "success");
  } catch {
    showToast("Copy failed. Please select and copy manually.", "error");
  }
}

/* ═══════════════════════════════════════════════
   TOASTS
   ═══════════════════════════════════════════════ */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3200);
}

/* ═══════════════════════════════════════════════
   MOBILE SIDEBAR
   ═══════════════════════════════════════════════ */
function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}

fabToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("open");
});

sidebarOverlay.addEventListener("click", () => {
  closeSidebar();
});

/* ═══════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════ */
function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
