const state = {
  chats: [],
  filteredChats: [],
  activeChat: null,
  loadedChats: new Map(),
  query: "",
};

const els = {
  summary: document.querySelector("#summary"),
  searchInput: document.querySelector("#searchInput"),
  chatList: document.querySelector("#chatList"),
  chatTitle: document.querySelector("#chatTitle"),
  chatMeta: document.querySelector("#chatMeta"),
  messages: document.querySelector("#messages"),
  exportButton: document.querySelector("#exportButton"),
};

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function searchText(chat) {
  return normalize(`${chat.title} ${chat.contactNumber} ${chat.folder}`);
}

function searchTokens() {
  return normalize(state.query).split(/\s+/).filter(Boolean);
}

function chatMatches(chat) {
  const tokens = searchTokens();
  if (!tokens.length) return true;

  const haystack = searchText(chat);
  return tokens.every((token) => haystack.includes(token));
}

function searchScore(chat) {
  const tokens = searchTokens();
  if (!tokens.length) return 0;

  const title = normalize(chat.title);
  const number = normalize(chat.contactNumber);
  const folder = normalize(chat.folder);
  const exactQuery = tokens.join(" ");

  if (title === exactQuery || number === exactQuery) return 0;
  if (title.startsWith(exactQuery) || number.startsWith(exactQuery)) return 1;
  if (tokens.every((token) => title.split(/\s+/).some((part) => part.startsWith(token)))) return 2;
  if (tokens.every((token) => title.includes(token))) return 3;
  if (tokens.every((token) => number.includes(token))) return 4;
  if (tokens.every((token) => folder.includes(token))) return 5;
  return 6;
}

function applyFilters() {
  state.filteredChats = state.chats
    .filter(chatMatches)
    .sort((a, b) => searchScore(a) - searchScore(b) || collator.compare(a.title, b.title));
  renderChatList();
}

function renderChatList() {
  if (!state.filteredChats.length) {
    els.chatList.innerHTML = '<div class="chat-item"><strong>Nenhuma conversa encontrada</strong><span>Revise o nome ou numero pesquisado.</span></div>';
    return;
  }

  els.chatList.innerHTML = state.filteredChats
    .map((chat) => {
      const active = state.activeChat?.id === chat.id ? " active" : "";
      const last = chat.lastAt ? formatDate(chat.lastAt) : "Sem data";
      return `
        <button class="chat-item${active}" data-chat-id="${chat.id}">
          <strong>${escapeHtml(chat.title)}</strong>
          <span>${chat.messageCount} registros, ${chat.readableCount} mensagens</span>
          <span>${escapeHtml(chat.contactNumber || chat.folder)} | ${last}</span>
        </button>
      `;
    })
    .join("");
}

async function loadChat(chatMeta) {
  if (state.loadedChats.has(chatMeta.id)) return state.loadedChats.get(chatMeta.id);
  const response = await fetch(chatMeta.dataFile);
  if (!response.ok) throw new Error(`Nao foi possivel carregar ${chatMeta.title}`);
  const chat = await response.json();
  state.loadedChats.set(chat.id, chat);
  return chat;
}

function renderConversation(chat) {
  state.activeChat = chat;
  els.exportButton.disabled = false;
  els.chatTitle.textContent = chat.title;
  els.chatMeta.textContent = `${chat.messageCount} registros | ${chat.contactNumber || "sem numero"} | ${formatDate(chat.firstAt)} ate ${formatDate(chat.lastAt)}`;

  const clientNumber = chat.contactNumber;
  const items = chat.messages.map((message) => {
    const isEvent = message.type.startsWith("ticket") || message.type === "call_log";
    const isOut = clientNumber && message.sender === clientNumber;
    const classes = ["message", isEvent ? "event" : "", isOut ? "out" : ""].filter(Boolean).join(" ");
    const body = message.text || labelForType(message.type);
    const file = message.file ? `<div class="file">${escapeHtml(message.file)}</div>` : "";
    const sender = isEvent ? "" : `<div class="sender">${escapeHtml(message.sender || "Sem remetente")}</div>`;

    return `
      <article class="${classes}">
        ${sender}
        <div class="text">${escapeHtml(body)}</div>
        ${file}
        <div class="time">${escapeHtml(message.type)} | ${formatDate(message.at)}</div>
      </article>
    `;
  });

  els.messages.classList.remove("empty");
  els.messages.innerHTML = items.join("");
  renderChatList();
}

function labelForType(type) {
  const labels = {
    document: "Documento anexado",
    image: "Imagem anexada",
    video: "Video anexado",
    audio: "Audio anexado",
    ptt: "Audio de voz",
    call_log: "Registro de chamada",
    ticket_open: "Chamado aberto",
    ticket_close: "Chamado fechado",
  };
  return labels[type] || type || "Registro";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function exportActiveChat() {
  if (!state.activeChat) return;
  const header = ["name", "message_timestamp", "message_type", "message_text", "message_file"];
  const rows = state.activeChat.messages.map((message) => [
    message.sender,
    message.at,
    message.type,
    message.text,
    message.file,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${state.activeChat.title.replace(/[^\w.-]+/g, "_")}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value || "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  applyFilters();
});

els.chatList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-id]");
  if (!button) return;
  const chatMeta = state.chats.find((item) => item.id === button.dataset.chatId);
  if (!chatMeta) return;
  els.messages.classList.add("empty");
  els.messages.innerHTML = "<p>Carregando conversa...</p>";
  loadChat(chatMeta)
    .then(renderConversation)
    .catch((error) => {
      els.messages.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
    });
});

els.exportButton.addEventListener("click", exportActiveChat);

fetch("data/index.json")
  .then((response) => {
    if (!response.ok) throw new Error("Nao foi possivel carregar data/index.json");
    return response.json();
  })
  .then((data) => {
    state.chats = data.chats || [];
    els.summary.textContent = `${data.chatCount || state.chats.length} conversas, ${data.messageCount || 0} registros`;
    applyFilters();
    if (state.chats[0]) {
      loadChat(state.chats[0]).then(renderConversation);
    }
  })
  .catch((error) => {
    els.summary.textContent = "Falha ao carregar os dados.";
    els.messages.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  });
