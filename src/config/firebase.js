// src/config/firebase.js
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();
const logger = require('../logger');

// Load Firebase Service Account Key for Authentication only
let serviceAccount;

// Try to load from environment variable first, then from file
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    logger.info('Firebase service account loaded from environment variable', { projectId: serviceAccount.project_id });
  } catch (error) {
    logger.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY environment variable:', error);
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
  }
} else {
  // Fallback to file
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || './firebase-admin-key.json';
  try {
    const keyPath = path.resolve(process.cwd(), serviceAccountPath);
    serviceAccount = require(keyPath);
    logger.info('Firebase service account loaded from file', { path: keyPath, projectId: serviceAccount.project_id });
  } catch (error) {
    logger.error('Error loading Firebase service account key from file:', error);
    logger.error('Attempted path', { path: path.resolve(process.cwd(), serviceAccountPath) });
    throw new Error('Firebase service account key not found');
  }
}

// Initialize Firebase Admin SDK (for Authentication only)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    // เพิ่มการตั้งค่าเพื่อแก้ปัญหา metadata.google.internal
    httpAgent: undefined,
    // บังคับใช้ service account credential แทน metadata server
    serviceAccountId: serviceAccount.client_email
  });
  logger.info('Firebase Admin SDK initialized (Authentication only)');
  logger.info('Storage: Cloudflare R2', { serviceAccount: serviceAccount.client_email });
}

// Export the default app
module.exports = admin;