// Report source files outside the application's static import graph.
// Review findings before deleting: dynamically constructed paths need manual checks.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else files.push(file);
  }
}
walk(root);
const known = new Set(files);
const visited = new Set();
function visit(file) {
  if (visited.has(file)) return;
  visited.add(file);
  if (!/\.(jsx?|css)$/.test(file)) return;
  const source = fs.readFileSync(file, "utf8");
  const imports = /(?:from\s*|import\s*(?:\(\s*)?|url\(\s*)["']([^"']+)["']/g;
  for (const match of source.matchAll(imports)) {
    if (!match[1].startsWith(".")) continue;
    const base = path.resolve(path.dirname(file), match[1]);
    const target = [base, base + ".js", base + ".jsx", path.join(base, "index.js")].find((candidate) => known.has(candidate));
    if (target) visit(target);
  }
}
visit(path.join(root, "main.jsx"));
const unused = files.filter((file) => !visited.has(file));
for (const file of unused) console.log(path.relative(process.cwd(), file));
console.log(unused.length + " source files outside the static import graph.");
