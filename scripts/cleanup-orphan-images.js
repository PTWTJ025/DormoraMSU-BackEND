#!/usr/bin/env node
// scripts/cleanup-orphan-images.js
// รัน: node scripts/cleanup-orphan-images.js [--dry-run] [--max-draft-age=24]

require("dotenv").config();
const cleanupService = require("../src/services/cleanupOrphanImagesService");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const maxAgeArg = args.find((a) => a.startsWith("--max-draft-age="));
const maxDraftAgeHours = maxAgeArg
  ? parseInt(maxAgeArg.split("=")[1], 10) || 24
  : 24;

console.log("🧹 Cleanup Orphan Images");
console.log("  dryRun:", dryRun);
console.log("  maxDraftAgeHours:", maxDraftAgeHours);
console.log("");

cleanupService
  .cleanupOrphanImages({ maxDraftAgeHours, dryRun })
  .then((stats) => {
    console.log("\n📊 Result:", stats);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
