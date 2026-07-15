import fs from "fs";
import path from "path";

const IMPORT_DIR = "./imports/pages";

if (!fs.existsSync(IMPORT_DIR)) {
  fs.mkdirSync(IMPORT_DIR, { recursive: true });
}

const files = fs.readdirSync(IMPORT_DIR);

const pages = {};

files
  .filter(f => f.endsWith(".json"))
  .sort()
  .forEach(file => {

    const data = JSON.parse(
      fs.readFileSync(
        path.join(IMPORT_DIR, file),
        "utf8"
      )
    );

    pages[data.page] = data;

  });

fs.writeFileSync(
  "./imports/book.json",
  JSON.stringify(
    {
      pages
    },
    null,
    2
  )
);

console.log("✅ book.json created");
