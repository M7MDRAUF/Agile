#!/usr/bin/env node
/**
 * Doc-vs-code consistency check (BUG-C01/C02/C03 regression guard).
 *
 * Scans Markdown files for relative links that point at repository files and
 * fails if any target does not exist. This catches the class of bug where the
 * docs reference deleted reports or claim files/paths that were never created.
 *
 * Scope: README.md, CLAUDE.md, AGENTS.md, DEPLOY.md and everything under docs/.
 * External links (http/https/mailto), in-page anchors (#foo) and template
 * placeholders ({{...}}, <...>) are ignored.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Collect tracked Markdown files via git (falls back to a static set). */
function markdownFiles() {
  try {
    const out = execSync("git ls-files *.md docs/**/*.md", {
      cwd: repoRoot,
      encoding: "utf8",
    });
    return out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return ["README.md", "CLAUDE.md", "AGENTS.md", "DEPLOY.md"];
  }
}

const LINK_RE = /\]\(([^)]+)\)/g;
const problems = [];

for (const rel of markdownFiles()) {
  const abs = join(repoRoot, rel);
  if (!existsSync(abs)) continue;
  const content = readFileSync(abs, "utf8");
  let match;
  while ((match = LINK_RE.exec(content)) !== null) {
    let target = match[1].trim();
    // Strip a markdown title: [text](path "title")
    target = target.replace(/\s+["'].*["']$/, "");
    // Ignore external links, anchors, mailto and templated placeholders.
    if (
      /^(https?:|mailto:|#|tel:)/.test(target) ||
      target.startsWith("{{") ||
      target.startsWith("<") ||
      target === ""
    ) {
      continue;
    }
    const [pathPart] = target.split("#");
    if (!pathPart) continue; // pure anchor
    const resolved = pathPart.startsWith("/")
      ? join(repoRoot, pathPart)
      : resolve(dirname(abs), pathPart);
    if (!existsSync(resolved)) {
      problems.push(`${rel}: broken link → ${target}`);
    }
  }
}

if (problems.length > 0) {
  console.error("Doc consistency check FAILED — broken internal links:\n");
  for (const p of problems) console.error(`  • ${p}`);
  console.error(`\n${problems.length} broken link(s).`);
  process.exit(1);
}

console.log("Doc consistency check passed — all internal Markdown links resolve.");
