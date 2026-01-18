#!/usr/bin/env node

/**
 * Publish helper scripts for manual npm publish with OTP.
 *
 * Workflow:
 *   1. pnpm prepublish:patch   (test -> build -> bump)
 *   2. npm publish             (manual, enter OTP via browser)
 *   3. pnpm postpublish        (git commit -> tag -> push)
 *
 * Or all at once (if you have automation token):
 *   pnpm publish:patch
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "..", "package.json");

function exec(command, options = {}) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { stdio: "inherit", ...options });
    return true;
  } catch (error) {
    if (options.allowFail) {
      console.warn(`   (skipped - already done or nothing to do)`);
      return false;
    }
    console.error(`\n❌ Failed: ${command}`);
    process.exit(1);
  }
}

function hasGitRemote() {
  try {
    const result = execSync("git remote", { encoding: "utf-8" });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function getVersion() {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  return pkg.version;
}

function bumpVersion(type) {
  const validTypes = ["patch", "minor", "major"];
  if (!validTypes.includes(type)) {
    console.error(
      `❌ Invalid version type: ${type}. Must be one of: ${validTypes.join(
        ", "
      )}`
    );
    process.exit(1);
  }

  console.log(`\n📦 Bumping ${type} version...`);
  exec(`npm version ${type} --no-git-tag-version`);
  return getVersion();
}

/**
 * Pre-publish: test -> build -> bump version
 */
function prepublish(versionType) {
  console.log("🚀 Pre-publish: preparing for release...\n");

  // Step 1: Test
  console.log("1️⃣  Running tests...");
  exec("npm test");

  // Step 2: Build
  console.log("\n2️⃣  Building...");
  exec("npm run build");

  // Step 3: Bump version
  const newVersion = bumpVersion(versionType);
  console.log(`\n✅ Version bumped to ${newVersion}`);

  console.log("\n" + "=".repeat(50));
  console.log(`📦 Ready to publish v${newVersion}`);
  console.log("=".repeat(50));
  console.log("\nNow run:");
  console.log("  npm publish");
  console.log("\nThen after successful publish, run:");
  console.log("  pnpm postpublish\n");
}

/**
 * Post-publish: git commit -> tag -> push
 */
function postpublish() {
  const version = getVersion();

  console.log("🚀 Post-publish: committing and pushing...\n");

  // Git commit and tag
  console.log("1️⃣  Creating git commit and tag...");
  exec("git add package.json");
  exec(`git commit -m "chore: release v${version}"`, { allowFail: true });
  exec(`git tag v${version}`, { allowFail: true });

  // Push to git (skip if no remote)
  if (hasGitRemote()) {
    console.log("\n2️⃣  Pushing to git...");
    exec("git push");
    exec("git push --tags");
  } else {
    console.log("\n⚠️  No git remote configured. Skipping push.");
    console.log("   To push later, run:");
    console.log("     git remote add origin <url>");
    console.log("     git push -u origin main --tags");
  }

  console.log(`\n✅ Successfully released fluxdom@${version}!\n`);
}

/**
 * Full publish (for automation tokens)
 */
function fullPublish(versionType) {
  console.log("🚀 Full publish workflow...\n");

  // Pre-publish steps
  console.log("1️⃣  Running tests...");
  exec("npm test");

  console.log("\n2️⃣  Building...");
  exec("npm run build");

  const newVersion = bumpVersion(versionType);
  console.log(`✅ Version bumped to ${newVersion}`);

  // Publish
  console.log("\n3️⃣  Publishing to npm...");
  exec("npm publish");

  // Post-publish steps
  console.log("\n4️⃣  Creating git commit and tag...");
  exec("git add package.json");
  exec(`git commit -m "chore: release v${newVersion}"`);
  exec(`git tag v${newVersion}`);

  // Push to git (skip if no remote)
  if (hasGitRemote()) {
    console.log("\n5️⃣  Pushing to git...");
    exec("git push");
    exec("git push --tags");
  } else {
    console.log("\n⚠️  No git remote configured. Skipping push.");
  }

  console.log(`\n✅ Successfully published fluxdom@${newVersion}!\n`);
}

// Main
const command = process.argv[2];
const versionType = process.argv[3];

switch (command) {
  case "pre":
    if (!versionType) {
      console.error(
        "❌ Usage: node scripts/publish.js pre <patch|minor|major>"
      );
      process.exit(1);
    }
    prepublish(versionType);
    break;

  case "post":
    postpublish();
    break;

  case "full":
    if (!versionType) {
      console.error(
        "❌ Usage: node scripts/publish.js full <patch|minor|major>"
      );
      process.exit(1);
    }
    fullPublish(versionType);
    break;

  default:
    console.error("❌ Usage:");
    console.error("  node scripts/publish.js pre <patch|minor|major>");
    console.error("  node scripts/publish.js post");
    console.error("  node scripts/publish.js full <patch|minor|major>");
    process.exit(1);
}
