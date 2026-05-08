const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const exportRoot = path.join(root, "tmp", "chats-exports");
const outDir = path.join(root, "digisac-viewer", "public", "data");
const outChatsDir = path.join(outDir, "chats");
const outIndexFile = path.join(outDir, "index.json");
const oldSingleFile = path.join(outDir, "chats.json");

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, results);
    if (entry.isFile() && entry.name.toLowerCase() === "chat.csv") results.push(fullPath);
  }
  return results;
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function cleanTitle(folderName) {
  return folderName
    .replace(/@(c\.us|g\.us|lid)$/i, "")
    .replace(/_[0-9]{6,}$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim() || folderName;
}

function parseDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function readChat(csvPath, index) {
  const folder = path.basename(path.dirname(csvPath));
  const source = path.basename(path.dirname(path.dirname(csvPath)));
  const content = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(content);
  const header = rows.shift() || [];
  const messages = [];
  const typeCounts = {};
  let contactNumber = "";

  for (const row of rows) {
    const record = Object.fromEntries(header.map((key, column) => [key, row[column] || ""]));
    const type = (record.message_type || "").trim() || "unknown";
    contactNumber = contactNumber || (record.contact_number || "").trim();
    typeCounts[type] = (typeCounts[type] || 0) + 1;
    messages.push({
      sender: (record.name || "").trim(),
      at: parseDate((record.message_timestamp || "").trim()),
      type,
      text: (record.message_text || "").trim(),
      file: (record.message_file || "").trim(),
    });
  }

  messages.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const readableCount = messages.filter(
    (message) => message.type === "chat" && (message.text || message.file),
  ).length;

  return {
    id: `chat-${String(index).padStart(4, "0")}`,
    title: cleanTitle(folder),
    folder,
    contactNumber,
    source,
    messageCount: messages.length,
    readableCount,
    firstAt: messages[0]?.at || "",
    lastAt: messages[messages.length - 1]?.at || "",
    typeCounts,
    messages,
  };
}

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(outChatsDir, { recursive: true, force: true });
fs.mkdirSync(outChatsDir, { recursive: true });
fs.rmSync(oldSingleFile, { force: true });

const csvFiles = walk(exportRoot).sort();
const chats = csvFiles
  .map((csvPath, index) => readChat(csvPath, index + 1))
  .sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" }));

for (const chat of chats) {
  fs.writeFileSync(
    path.join(outChatsDir, `${chat.id}.json`),
    JSON.stringify(chat),
    "utf8",
  );
}

const indexChats = chats.map(({ messages, ...chat }) => ({
  ...chat,
  dataFile: `data/chats/${chat.id}.json`,
}));

const payload = {
  generatedAt: new Date().toISOString(),
  chatCount: indexChats.length,
  messageCount: indexChats.reduce((total, chat) => total + chat.messageCount, 0),
  chats: indexChats,
};

fs.writeFileSync(outIndexFile, JSON.stringify(payload), "utf8");
console.log(`Generated ${outIndexFile}`);
console.log(`Generated ${outChatsDir}`);
console.log(`Chats: ${payload.chatCount}`);
console.log(`Messages: ${payload.messageCount}`);
