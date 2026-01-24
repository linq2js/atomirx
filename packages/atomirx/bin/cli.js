#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COMMANDS = {
  "add-skill": addSkill,
  help: showHelp,
};

function showHelp() {
  console.log(`
atomirx CLI

Usage:
  npx atomirx <command>

Commands:
  add-skill    Install atomirx Cursor skills to your project
  help         Show this help message

Examples:
  npx atomirx add-skill
`);
}

function addSkill() {
  const sourceDir = join(__dirname, "..", "skills", "atomirx");
  const targetDir = join(process.cwd(), ".cursor", "skills", "atomirx");

  // Check if source skills exist
  if (!existsSync(sourceDir)) {
    console.error("❌ Skills not found in package. This may be a packaging issue.");
    process.exit(1);
  }

  // Check if target already exists
  if (existsSync(targetDir)) {
    console.log("⚠️  Skills already exist at .cursor/skills/atomirx");
    console.log("   To reinstall, remove the directory first and run again.");
    return;
  }

  // Create target directory
  mkdirSync(targetDir, { recursive: true });

  // Copy skills recursively
  copyRecursive(sourceDir, targetDir);

  console.log("✅ atomirx skills installed to .cursor/skills/atomirx");
  console.log("");
  console.log("The skill includes:");
  console.log("  - SKILL.md - Main skill guide");
  console.log("  - references/ - Detailed pattern documentation");
  console.log("");
  console.log("Your AI assistant will now have access to atomirx best practices!");
}

function copyRecursive(source, target) {
  const entries = readdirSync(source);

  for (const entry of entries) {
    const sourcePath = join(source, entry);
    const targetPath = join(target, entry);
    const stat = statSync(sourcePath);

    if (stat.isDirectory()) {
      mkdirSync(targetPath, { recursive: true });
      copyRecursive(sourcePath, targetPath);
    } else {
      cpSync(sourcePath, targetPath);
    }
  }
}

// Main
const command = process.argv[2] || "help";
const handler = COMMANDS[command];

if (handler) {
  handler();
} else {
  console.error(`Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}
