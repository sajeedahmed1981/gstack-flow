#!/usr/bin/env bun
// gstack-flow — system-map generator
// Extracts structure with Madge, merges an optional AI-authored curation layer,
// injects into the interactive template → a self-contained system-map.html.
//
// Usage (from repo root):
//   bun tools/system-map/build-map.mjs \
//     --backend src --frontendRoot frontend --frontend app,components,lib \
//     --curation map-curation.json --out system-map.html
//
// Curation file (optional, AI-authored) shape:
//   { "nodes": { "<path or basename>": {layer, role, input, output} },
//     "layers": [ {id,label,color} ],
//     "flows":  [ {name,color,nodes:["<id>", ...ordered] } ] }
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const args = {};
process.argv.slice(2).forEach((a, i, arr) => {
  if (a.startsWith("--")) args[a.slice(2)] = arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true";
});
const OUT = args.out || "system-map.html";
const CUR = args.curation || "map-curation.json";
const BACKENDS = (args.backend || "src").split(",").filter(Boolean);
const FRONT_ROOT = args.frontendRoot || (existsSync("frontend") ? "frontend" : "");
const FRONT_DIRS = (args.frontend || "app,components,lib").split(",").filter(Boolean);
const EXT = "ts,tsx,js,jsx";

function madgeJson(dirs, cwd) {
  const present = dirs.filter((d) => existsSync(join(cwd, d)));
  if (!present.length) return {};
  try {
    const out = execSync(`madge --json --extensions ${EXT} ${present.map((d) => `'${d}'`).join(" ")}`,
      { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 26 });
    return JSON.parse(out);
  } catch { return {}; }
}

const nodesMap = new Map();
const edges = [];
const addNode = (p) => { if (!nodesMap.has(p)) nodesMap.set(p, { id: p, label: basename(p), path: p }); };
function ingest(json, prefix) {
  for (const [file, deps] of Object.entries(json)) {
    const src = prefix ? `${prefix}/${file}` : file;
    addNode(src);
    for (const d of deps) { const tgt = prefix ? `${prefix}/${d}` : d; addNode(tgt); edges.push({ source: src, target: tgt }); }
  }
}

if (BACKENDS.length) ingest(madgeJson(BACKENDS, "."), "");
if (FRONT_ROOT) ingest(madgeJson(FRONT_DIRS, FRONT_ROOT), FRONT_ROOT);

const deg = {};
for (const e of edges) { deg[e.source] = (deg[e.source] || 0) + 1; deg[e.target] = (deg[e.target] || 0) + 1; }

let curation = { nodes: {}, layers: [], flows: [] };
if (existsSync(CUR)) { try { curation = { ...curation, ...JSON.parse(readFileSync(CUR, "utf8")) }; } catch (e) { console.error("curation parse error:", e.message); } }

const topDir = (p) => (p.includes("/") ? p.split("/").slice(0, 2).join("/") : "root");
const nodes = [...nodesMap.values()].map((n) => {
  const c = curation.nodes[n.path] || curation.nodes[n.label] || {};
  return { ...n, deg: deg[n.path] || 0, layer: c.layer || topDir(n.path), role: c.role || "", input: c.input || "", output: c.output || "" };
});

let layers = curation.layers;
if (!layers || !layers.length) {
  const uniq = [...new Set(nodes.map((n) => n.layer))];
  const palette = ["#4f9dff", "#f0a02a", "#22d3c5", "#a855f7", "#ec4899", "#34d399", "#f43f5e", "#60a5fa", "#fbbf24"];
  layers = uniq.map((id, i) => ({ id, label: id, color: palette[i % palette.length] }));
}
const data = { nodes, edges, layers, flows: curation.flows || [], meta: { count: nodes.length, edges: edges.length } };

const tpl = readFileSync(join(__dir, "template.html"), "utf8");
writeFileSync(OUT, tpl.replace("/*__MAP_DATA__*/null", JSON.stringify(data)));
console.log(`system-map: ${nodes.length} nodes, ${edges.length} edges → ${OUT}`);
