#!/usr/bin/env node
// scripts/cleanup-orphan-images.js
// รัน: node scripts/cleanup-orphan-images.js [--dry-run] [--max-draft-age=24]

require("dotenv").config();
const logger = require("../src/logger");
const cleanupService = require("../src/services/cleanupOrphanImagesService");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const maxAgeArg = args.find((a) => a.startsWith("--max-draft-age="));
const maxDraftAgeHours = maxAgeArg
  ? parseInt(maxAgeArg.split("=")[1], 10) || 24
  : 24;

logger.info("Cleanup Orphan Images", { dryRun, maxDraftAgeHours });

cleanupService
  .cleanupOrphanImages({ maxDraftAgeHours, dryRun })
  .then((stats) => {
    logger.info("Cleanup result", stats);
    process.exit(0);
  })
  .catch((err) => {
    logger.error("Cleanup failed", { error: err.message });
    process.exit(1);
  });
