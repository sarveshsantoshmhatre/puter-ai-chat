const STORAGE_KEY = "puter-ai-chat-history-v2";
const THEME_KEY = "puter-ai-chat-theme-v1";
const SIDEBAR_KEY = "puter-ai-chat-sidebar-v1";
const state = { messages: [], busy: false };
const els = {
  body: document.body,
  html: document.documentElement,
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  desktopSidebarBtn: document.getElementById("desktopSidebarBtn"),
  mobileSidebarBtn: document.getElementById("mobileSidebarBtn"),
  messages: document.getElementById("messages"),
  form: document.getElementById("chatForm"),
  input: document.getElementById("promptInput"),
  send: document.getElementById("sendBtn"),
  newChat: document.getElementById("newChatBtn"),
  clear: document.getElementById("clearBtn"),
  model: document.getElementById("modelSelect"),
  modelBadge: document.getElementById("modelBadge"),
  modelStatus: document.getElementById("modelStatus"),
  title: document.getElementById("chatTitle"),
  theme: document.getElementById("themeBtn"),
  suggestions: document.getElementById("suggestions"),
  scrollDown: document.getElementById("scrollDownBtn")
};

marked.setOptions({ gfm: true, breaks: true });

const modelNames = Object.fromEntries([...els.model.options].map(option => [option.value, option.textContent]));

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages));
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    state.messages = Array.isArray(parsed) ? parsed.filter(item => item && (item.role === "user" || item.role === "assistant")) : [];
  } catch {
    state.messages = [];
  }
}

function safeMarkdown(text) {
  return DOMPurify.sanitize(marked.parse(String(text || "")), { USE_PROFILES: { html: true } });
}

function renderMarkdown(text) {
  const holder = document.createElement("div");
  holder.className = "markdown";
  holder.innerHTML = safeMarkdown(text);

  holder.querySelectorAll("a").forEach(link => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  holder.querySelectorAll("pre code").forEach(code => {
    const pre = code.parentElement;
    const match = code.className.match(/language-([\w-]+)/);
    const lang = match ? match[1] : "text";
    try {
      if (lang !== "text") hljs.highlightElement(code);
    } catch {}

    const wrap = document.createElement("div");
    wrap.className = "code-wrap";
    const head = document.createElement("div");
    head.className = "code-head";
    const label = document.createElement("span");
    label.textContent = lang;
    const copy = document.createElement("button");
    copy.className = "copy-code";
    copy.type = "button";
    copy.textContent = "Copy";
    copy.dataset.code = code.textContent;
    head.append(label, copy);
    pre.parentNode.insertBefore(wrap, pre);
    wrap.append(head, pre);
  });

  return holder;
}

function makeAnswerBody(content) {
  const body = document.createElement("div");
  body.className = "message-body";
  body.appendChild(renderMarkdown(content));
  return body;
}

function makeAvatar(role) {
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = role === "assistant" ? "✦" : "You";
  return avatar;
}

function makeMeta(role) {
  const meta = document.createElement("div");
  meta.className = "message-meta";

  const roleName = document.createElement("span");
  roleName.className = "role-name";
  roleName.textContent = role === "assistant" ? "Assistant" : "You";
  meta.appendChild(roleName);

  if (role === "assistant") {
    const model = document.createElement("span");
    model.className = "meta-model";
    model.textContent = modelNames[els.model.value] || els.model.value;
    meta.appendChild(model);
  }

  return meta;
}

function renderEmpty() {
  els.messages.innerHTML = `
    <div class="empty">
      <div class="empty-card">
        <div class="empty-logo" aria-hidden="true">✦</div>
        <h3>How can I help?</h3>
        <p>Ask a question, learn a concept, write code, or compare ideas. Answers are rendered as polished Markdown with readable structure and highlighted code.</p>
        <div class="empty-hint">Try one of the prompts below or start typing.</div>
      </div>
    </div>`;
}

function render() {
  if (!state.messages.length) {
    renderEmpty();
    els.title.textContent = "New conversation";
    updateScrollButton();
    return;
  }

  const firstUser = state.messages.find(message => message.role === "user");
  const title = firstUser?.content?.trim() || "Conversation";
  els.title.textContent = title.length > 54 ? `${title.slice(0, 54)}…` : title;
  els.messages.innerHTML = "";

  for (const msg of state.messages) {
    const row = document.createElement("div");
    row.className = `message-row ${msg.role}`;

    const shell = document.createElement("div");
    shell.className = "message-shell";

    const bubble = document.createElement("div");
    bubble.className = `message ${msg.role}`;
    bubble.appendChild(makeMeta(msg.role));

    if (msg.role === "assistant") {
      bubble.appendChild(makeAnswerBody(msg.content));
      const actions = document.createElement("div");
      actions.className = "answer-actions";
      const copy = document.createElement("button");
      copy.className = "copy-answer";
      copy.type = "button";
      copy.textContent = "Copy answer";
      copy.dataset.answer = msg.content;
      actions.appendChild(copy);
      bubble.appendChild(actions);
    } else {
      const body = document.createElement("div");
      body.className = "message-body";
      body.textContent = msg.content;
      bubble.appendChild(body);
    }

    shell.append(makeAvatar(msg.role), bubble);
    row.appendChild(shell);
    els.messages.appendChild(row);
  }

  updateScrollButton();
  requestAnimationFrame(() => {
    els.messages.scrollTop = els.messages.scrollHeight;
    updateScrollButton();
  });
}

function setBusy(value) {
  state.busy = value;
  els.send.disabled = value;
  els.input.disabled = value;
  els.model.disabled = value;
  els.modelStatus.textContent = value ? "Generating" : "Ready";
  els.modelStatus.classList.toggle("busy", value);
  els.send.querySelector("span:first-child").textContent = value ? "Thinking" : "Send";
}

function appendAssistantPlaceholder() {
  const row = document.createElement("div");
  row.className = "message-row assistant";
  const shell = document.createElement("div");
  shell.className = "message-shell";
  const bubble = document.createElement("div");
  bubble.className = "message assistant";
  bubble.appendChild(makeMeta("assistant"));
  const body = document.createElement("div");
  body.className = "message-body";
  body.innerHTML = '<span class="typing" aria-label="Generating"><span></span><span></span><span></span></span>';
  bubble.appendChild(body);
  shell.append(makeAvatar("assistant"), bubble);
  row.appendChild(shell);
  els.messages.appendChild(row);
  scrollToBottom();
  return body;
}

function updateStreamingBody(body, text) {
  body.replaceChildren(renderMarkdown(text));
  scrollToBottom();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    document.body.appendChild(helper);
    helper.select();
    const ok = document.execCommand("copy");
    helper.remove();
    return ok;
  }
}

function flashCopied(button, original = "Copy") {
  button.textContent = "Copied";
  setTimeout(() => { button.textContent = original; }, 1200);
}

function scrollToBottom() {
  els.messages.scrollTop = els.messages.scrollHeight;
  updateScrollButton();
}

function updateScrollButton() {
  const distance = els.messages.scrollHeight - els.messages.scrollTop - els.messages.clientHeight;
  els.scrollDown.classList.toggle("visible", distance > 220);
}

function setTheme(theme) {
  els.html.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  els.theme.textContent = theme === "dark" ? "☼" : "☾";
  els.theme.title = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  els.theme.setAttribute("aria-label", els.theme.title);
}

function loadTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const preferred = window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  setTheme(stored === "light" || stored === "dark" ? stored : preferred);
}

function syncModelBadge() {
  els.modelBadge.textContent = modelNames[els.model.value] || els.model.value;
}

function openMobileSidebar() {
  els.sidebar.classList.add("open");
  els.sidebarBackdrop.classList.add("visible");
}

function closeMobileSidebar() {
  els.sidebar.classList.remove("open");
  els.sidebarBackdrop.classList.remove("visible");
}

function toggleDesktopSidebar() {
  const collapsed = els.body.classList.toggle("sidebar-collapsed");
  localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "open");
}

async function sendMessage(text) {
  if (!text || state.busy) return;

  state.messages.push({ role: "user", content: text });
  saveHistory();
  render();

  const body = appendAssistantPlaceholder();
  setBusy(true);

  try {
    const messages = [
      {
        role: "system",
        content: "You are a helpful AI assistant. Use well-structured Markdown whenever it improves clarity. Use concise headings, bullets or numbered steps, tables for comparisons, blockquotes for notes, inline code for identifiers, and fenced code blocks with a language label for code. Do not wrap the entire response in one code block. Prefer readable structure over excessive formatting."
      },
      ...state.messages
    ];

    const response = await puter.ai.chat(messages, { model: els.model.value, stream: true });
    let accumulated = "";

    for await (const part of response) {
      if (part?.type === "error") {
        throw new Error(part.error?.message || "The AI provider returned an error.");
      }
      const chunk = part?.text ?? "";
      if (chunk) {
        accumulated += chunk;
        updateStreamingBody(body, accumulated);
      }
    }

    if (!accumulated.trim()) accumulated = "I didn't receive any text from the model.";
    state.messages.push({ role: "assistant", content: accumulated });
    saveHistory();
    render();
  } catch (error) {
    body.innerHTML = `<div class="error-message"><strong>Something went wrong.</strong><span>${escapeHtml(error?.message || "Unable to contact Puter AI.")}</span></div>`;
  } finally {
    setBusy(false);
    els.input.focus();
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function newChat() {
  state.messages = [];
  saveHistory();
  render();
  els.input.value = "";
  autoResize();
  els.input.focus();
  closeMobileSidebar();
}

els.form.addEventListener("submit", async event => {
  event.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;
  els.input.value = "";
  autoResize();
  await sendMessage(text);
});

els.input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    els.form.requestSubmit();
  }
});

els.input.addEventListener("input", autoResize);

function autoResize() {
  els.input.style.height = "auto";
  els.input.style.height = `${Math.min(els.input.scrollHeight, 190)}px`;
}

els.newChat.addEventListener("click", newChat);
els.clear.addEventListener("click", newChat);
els.theme.addEventListener("click", () => setTheme(els.html.dataset.theme === "dark" ? "light" : "dark"));
els.desktopSidebarBtn.addEventListener("click", toggleDesktopSidebar);
els.mobileSidebarBtn.addEventListener("click", openMobileSidebar);
els.sidebarBackdrop.addEventListener("click", closeMobileSidebar);
els.model.addEventListener("change", syncModelBadge);
els.scrollDown.addEventListener("click", scrollToBottom);
els.messages.addEventListener("scroll", updateScrollButton, { passive: true });

els.suggestions.addEventListener("click", event => {
  const button = event.target.closest("button[data-prompt]");
  if (!button || state.busy) return;
  els.input.value = button.dataset.prompt;
  autoResize();
  els.form.requestSubmit();
});

els.messages.addEventListener("click", async event => {
  const codeButton = event.target.closest(".copy-code");
  const answerButton = event.target.closest(".copy-answer");

  if (codeButton) {
    const ok = await copyText(codeButton.dataset.code || "");
    if (ok) flashCopied(codeButton, "Copy");
  }

  if (answerButton) {
    const ok = await copyText(answerButton.dataset.answer || "");
    if (ok) flashCopied(answerButton, "Copy answer");
  }
});

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    els.input.focus();
  }
  if (event.key === "Escape") closeMobileSidebar();
});

loadHistory();
loadTheme();
syncModelBadge();
if (localStorage.getItem(SIDEBAR_KEY) === "collapsed" && window.innerWidth > 980) {
  els.body.classList.add("sidebar-collapsed");
}
render();
autoResize();
els.input.focus();
