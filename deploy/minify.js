// Build step: minify css/js into dist/ for deployment.
// index.html is copied as-is (its <link>/<script> paths are unchanged).
const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, "css"), { recursive: true });
fs.mkdirSync(path.join(dist, "js"), { recursive: true });

fs.copyFileSync(path.join(root, "index.html"), path.join(dist, "index.html"));

esbuild.buildSync({
  entryPoints: [path.join(root, "css", "style.css")],
  outfile: path.join(dist, "css", "style.css"),
  minify: true
});

esbuild.buildSync({
  entryPoints: [path.join(root, "js", "app.js")],
  outfile: path.join(dist, "js", "app.js"),
  minify: true
});

console.log("Minified frontend -> dist/");
