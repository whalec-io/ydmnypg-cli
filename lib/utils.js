import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { randomBytes } from "crypto";

export const ACTIONS = ["create", "delete", "get", "list", "update"];

export function exec(cmd) {
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch {
    process.exit(1);
  }
}

export function mkdir(base, dir) {
  fs.mkdirSync(path.join(base, dir), { recursive: true });
}

export function ucfirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function randomPassword(length = 20) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(randomBytes(length))
    .map(b => chars[b % chars.length])
    .join("");
}

export async function copyStaticFiles(options) {
  const { source, destination, templatesDir, excludes = [], onExcluded } = options;
  const sourceRoot = path.join(templatesDir, source);
  await walkDir(sourceRoot, sourceRoot, destination, excludes, onExcluded);
}

async function walkDir(root, currentDir, destination, excludes, onExcluded) {
  const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const relDir = path.relative(root, currentDir);
    const fullSrc = path.join(currentDir, entry.name);
    const isExcluded = excludes.some(ex => entry.name.includes(ex));

    if (isExcluded) {
      if (typeof onExcluded === "function") onExcluded({ relDir, file: entry.name });
      continue;
    }

    if (entry.isDirectory()) {
      await walkDir(root, fullSrc, destination, excludes, onExcluded);
    } else {
      const destPath = path.join(destination, relDir, entry.name);
      if (!fs.existsSync(destPath)) {
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await fs.promises.copyFile(fullSrc, destPath);
      }
    }
  }
}
