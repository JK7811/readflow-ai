import fs from "fs";
import path from "path";

const INPUT = "./imports/book.json";
const OUTPUT = "./book-data.json";

if (!fs.existsSync(INPUT)) {
  console.log("❌ imports/book.json not found");
  process.exit(1);
}

const imported = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const current = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));

if (!current.pages) current.pages = {};

Object.entries(imported.pages).forEach(([id, page]) => {
  current.pages[id] = page;
});

current.enhancedPages = Object.keys(current.pages).length;

fs.writeFileSync(
  OUTPUT,
  JSON.stringify(current, null, 2),
  "utf8"
);

console.log(
  `✅ Imported ${Object.keys(imported.pages).length} pages`
);
