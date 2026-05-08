const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const exportRoot = path.join(root, "tmp", "chats-exports");
const dataRoot = path.join(root, "digisac-viewer", "data");
const indexFile = path.join(dataRoot, "index.json");
const chatsDir = path.join(dataRoot, "chats");

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, results);
    if (entry.isFile() && entry.name.toLowerCase() === "chat.csv") results.push(fullPath);
  }
  return results;
}

function main() {
  const csvFiles = walk(exportRoot);
  const jsonFiles = fs.readdirSync(chatsDir).filter((name) => /^chat-\d{4}\.json$/.test(name));
  const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  const emptyCsvs = csvFiles.filter((file) => fs.statSync(file).size === 0);

  let messageCount = 0;
  const brokenJsons = [];
  for (const file of jsonFiles) {
    try {
      const chat = JSON.parse(fs.readFileSync(path.join(chatsDir, file), "utf8"));
      messageCount += Array.isArray(chat.messages) ? chat.messages.length : 0;
    } catch (error) {
      brokenJsons.push(`${file}: ${error.message}`);
    }
  }

  console.log(`CSV files: ${csvFiles.length}`);
  console.log(`JSON chat files: ${jsonFiles.length}`);
  console.log(`Index chats: ${index.chatCount}`);
  console.log(`Index messages: ${index.messageCount}`);
  console.log(`JSON messages: ${messageCount}`);
  console.log(`Empty CSV files: ${emptyCsvs.length}`);
  console.log(`Broken JSON files: ${brokenJsons.length}`);

  const ok =
    csvFiles.length === jsonFiles.length &&
    jsonFiles.length === index.chatCount &&
    messageCount === index.messageCount &&
    emptyCsvs.length === 0 &&
    brokenJsons.length === 0;

  if (!ok) {
    if (emptyCsvs.length) console.error(emptyCsvs.join("\n"));
    if (brokenJsons.length) console.error(brokenJsons.join("\n"));
    process.exit(1);
  }
}

main();
